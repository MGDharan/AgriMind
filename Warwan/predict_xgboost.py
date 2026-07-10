import os
import glob
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import r2_score, mean_absolute_error
from xgboost import XGBRegressor
import warnings
warnings.filterwarnings('ignore')

# --- 1. LOAD THE DATASET ---
def load_historical_data():
    base_dir = r'f:\Warwan'
    dirs = {'msavi': 'dataset', 'ndvi': 'dataset1', 'ndmi': 'dataset2'}
    
    combined_dfs = []
    for var, folder in dirs.items():
        all_files = glob.glob(os.path.join(base_dir, folder, "*.xlsx"))
            
        df_list = []
        for file in all_files:
            if not os.path.exists(file): continue
            df = pd.read_excel(file)
            date_col = next((col for col in df.columns if 'date' in str(col).lower() or 'year' in str(col).lower() or 'time' in str(col).lower()), df.columns[0])
            val_col = next((col for col in df.columns if var in str(col).lower()), df.columns[1] if len(df.columns) > 1 else df.columns[0])
            
            temp = df[[date_col, val_col]].rename(columns={date_col: 'date', val_col: var})
            temp['date'] = pd.to_datetime(temp['date'], errors='coerce')
            temp[var] = pd.to_numeric(temp[var], errors='coerce')
            df_list.append(temp.dropna())
            
        var_df = pd.concat(df_list, ignore_index=True)
        var_df = var_df.groupby('date')[var].mean().reset_index()
        combined_dfs.append(var_df)

    # Outer merge to intentionally create missing values simulating a direct multi-column CSV load
    df_main = combined_dfs[0]
    df_main = pd.merge(df_main, combined_dfs[1], on='date', how='outer')
    df_main = pd.merge(df_main, combined_dfs[2], on='date', how='outer')
    df_main = df_main.sort_values('date').set_index('date')
    
    # Optional: ensure continuous daily index so missing dates become NaNs
    full_idx = pd.date_range(start=df_main.index.min(), end=df_main.index.max(), freq='D')
    df_main = df_main.reindex(full_idx)
    return df_main

# --- 2. IMPUTATION ---
def impute_missing_values(df):
    indices = ['ndvi', 'ndmi', 'msavi']
    
    # A. Time-based linear interpolation
    df[indices] = df[indices].interpolate(method='time')
    
    # B. Fill remaining edge gaps using seasonal median grouped by day-of-year
    df['doy_temp'] = df.index.dayofyear
    for col in indices:
        if df[col].isnull().any():
            seasonal_medians = df.groupby('doy_temp')[col].transform('median')
            df[col] = df[col].fillna(seasonal_medians)
            # If still missing (a doy entirely NaN), ffill and bfill as last resort
            df[col] = df[col].ffill().bfill()
            
    df = df.drop(columns=['doy_temp'])
    return df

# --- 3. FEATURE ENGINEERING ---
def create_features_for_index(df_history, target_idx, indices=['ndvi', 'ndmi', 'msavi']):
    """
    Creates engineered features. For a multi-step forecast, df_history is the series up to point T.
    Since we predict based on past data, all target values must be shifted.
    """
    df = df_history.copy()
    
    lags = [1, 2, 3, 7, 14, 21, 30, 60, 90]
    windows = [7, 14, 30, 60]
    
    # Create features directly on the target column 
    target_series = df[target_idx]
    
    # 1. Target Lags
    for lag in lags:
        df[f'lag_{lag}'] = target_series.shift(lag)
        
    # 2. Rolling stats on target (we must shift by 1 first so we don't leak the current day's target)
    shifted_target = target_series.shift(1)
    for w in windows:
        roll = shifted_target.rolling(window=w, min_periods=1)
        df[f'roll_mean_{w}'] = roll.mean()
        df[f'roll_std_{w}'] = roll.std().fillna(0)
        df[f'roll_min_{w}'] = roll.min()
        df[f'roll_max_{w}'] = roll.max()
        
    # 3. Expanding mean
    df['expanding_mean'] = shifted_target.expanding(min_periods=1).mean()
    
    # 4. Cross-index lags (using shift(1) exclusively as requested representing previous availability)
    for other_idx in indices:
        if other_idx != target_idx:
            df[f'{other_idx}_lag_1'] = df[other_idx].shift(1)
            
    # 5. Time features
    df['year'] = df.index.year
    df['month'] = df.index.month
    df['day_of_year'] = df.index.dayofyear
    df['week'] = df.index.isocalendar().week.astype(int)
    
    # 6. Fourier terms
    doy_scaled = df['day_of_year'] / 365.25
    for k in [1, 2, 3]:
        df[f'sin_k{k}'] = np.sin(2 * np.pi * k * doy_scaled)
        df[f'cos_k{k}'] = np.cos(2 * np.pi * k * doy_scaled)
        
    # Drop original index columns (except target) and drop NA from max lag
    df = df.drop(columns=[col for col in indices if col != target_idx])
    return df

# --- PIPELINE EXECUTIONS ---
if __name__ == "__main__":
    print("Loading and constructing combined dataset...")
    df_raw = load_historical_data()
    
    print("Imputing missing values using time interpolation and DOY median...")
    df_imputed = impute_missing_values(df_raw)
    
    indices = ['ndvi', 'ndmi', 'msavi']
    models = {}
    target_accuracies_reached = {}

    xgb_params = {
        'n_estimators': 800,
        'learning_rate': 0.05,
        'max_depth': 6,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'min_child_weight': 3,
        'reg_alpha': 0.1,
        'reg_lambda': 1.0,
        'random_state': 42,
        'n_jobs': -1
    }

    # --- 4. TRAIN AND CROSS VALIDATE ---
    for target in indices:
        print(f"\nEvaluating XGBoost model for {target.upper()}...")
        # Prepare full feature set for the entire history
        df_feat = create_features_for_index(df_imputed, target)
        df_feat = df_feat.dropna()
        
        X = df_feat.drop(columns=[target])
        y = df_feat[target].values
        
        tscv = TimeSeriesSplit(n_splits=5)
        fold_r2 = []
        fold_mae = []
        
        for fold, (train_idx, test_idx) in enumerate(tscv.split(X)):
            X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
            y_train, y_test = y[train_idx], y[test_idx]
            
            model = XGBRegressor(**xgb_params)
            model.fit(X_train, y_train)
            
            preds = model.predict(X_test)
            fold_r2.append(r2_score(y_test, preds))
            fold_mae.append(mean_absolute_error(y_test, preds))
            
        mean_r2 = np.mean(fold_r2) * 100
        mean_mae = np.mean(fold_mae)
        
        for i in range(5):
            print(f"  Fold {i+1} | R2: {fold_r2[i]*100:.2f}% | MAE: {fold_mae[i]:.4f}")
        
        print(f" -> Overall CV R2: {mean_r2:.2f}% | Overall CV MAE: {mean_mae:.4f}")
        
        # Train final model on entire historical dataset
        final_model = XGBRegressor(**xgb_params)
        final_model.fit(X, y)
        models[target] = (final_model, list(X.columns))
        
        if mean_r2 < 90.0:
            target_accuracies_reached[target] = False
        else:
            target_accuracies_reached[target] = True

    # Alert for improvements
    for target, reached in target_accuracies_reached.items():
        if not reached:
            print(f"\n[SUGGESTION] Model for {target.upper()} did not reliably hit >= 90% CV R-Squared.")
            print(f"-> Next Improvement Step: Add external meteorological features like rainfall, temperature, and soil moisture.")

    # --- 5 & 6. RECURSIVE MULTI-STEP FORECASTING ---
    print("\nStarting recursive multi-step prediction for all days in 2025 and 2026 (Daily frequency)...")
    # Base history is strictly the historical data
    history_df = df_imputed.copy()
    
    # Determine the start of forecasting. 
    # Current dataset max might be into 2026 because of the new file, or early 2024. 
    # Let's cleanly generate targets starting from 2025-01-01 if it's the future, or right after history ends.
    future_dates = pd.date_range(start='2025-01-01', end='2026-12-31', freq='D')
    
    # We iteratively predict each step
    predicted_records = []
    
    for current_date in future_dates:
        # If the history already has this date (because of overlap), we overwrite/append dummy to predict it freshly 
        # as a forecast mapping for strict compliance with the scenario.
        
        predictions_for_step = {}
        for target in indices:
            df_feat = create_features_for_index(history_df, target)
            # The feature row for predicting 'current_date' requires engineering features UP TO the day BEFORE 
            # Or effectively, we append a blank row for current_date, run engineer, and extract its features.
            
            temp_history = history_df.copy()
            if current_date not in temp_history.index:
                temp_history.loc[current_date] = [np.nan, np.nan, np.nan] # Blank target row
                
            features_df = create_features_for_index(temp_history, target)
            feature_row = features_df.loc[[current_date]].drop(columns=[target], errors='ignore')
            
            model, cols = models[target]
            pred = model.predict(feature_row[cols])[0]
            
            # Clip step 6
            if target == 'msavi':
                pred = np.clip(pred, 0, 1)
            else:
                pred = np.clip(pred, -1, 1)
                
            predictions_for_step[target] = pred
        
        # Append the new predictions to history to act as the base for the NEXT recursive step
        predictions_for_step['date'] = current_date
        predicted_records.append(predictions_for_step)
        
        # Update history
        history_df.loc[current_date] = [predictions_for_step['ndvi'], predictions_for_step['ndmi'], predictions_for_step['msavi']]
        
    df_forecast = pd.DataFrame(predicted_records)
    df_forecast = df_forecast[['date', 'ndvi', 'ndmi', 'msavi']]
    df_forecast = df_forecast.rename(columns={'ndvi': 'ndvi_predicted', 'ndmi': 'ndmi_predicted', 'msavi': 'msavi_predicted'})
    
    # --- 7. SAVE ---
    out_path = r'f:\Warwan\predictions_advanced_2025_2026_daily_V2.csv'
    df_forecast.to_csv(out_path, index=False)
    print(f"\nAdvanced future predictions securely saved to {out_path}")

    # --- 8. PLOT FEATURE IMPORTANCE ---
    print("Generating feature importance plots...")
    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle('Feature Importance (Top 15) across Index Models', fontsize=16)

    for idx, target in enumerate(indices):
        model, cols = models[target]
        importances = model.feature_importances_
        # Sort top 15
        sorted_idx = np.argsort(importances)[-15:]
        
        ax = axes[idx]
        ax.barh(range(15), importances[sorted_idx], align='center', color='skyblue')
        ax.set_yticks(range(15))
        ax.set_yticklabels([cols[i] for i in sorted_idx])
        ax.set_title(f'{target.upper()} Feature Importance')
        ax.set_xlabel('Score')
        
    plt.tight_layout()
    plt.savefig(r'f:\Warwan\feature_importance.png')
    print("Plot securely saved mapping f:\\Warwan\\feature_importance.png!")
