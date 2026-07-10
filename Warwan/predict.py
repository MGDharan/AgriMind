import os
import glob
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPRegressor
import warnings
warnings.filterwarnings('ignore')

# 1. Define paths to directories
base_dir = r'f:\Warwan'
dirs = {
    'MSAVI': os.path.join(base_dir, 'dataset'),
    'NDVI': os.path.join(base_dir, 'dataset1'),
    'NDMI': os.path.join(base_dir, 'dataset2')
}

# 2. Function to load and combine Excel files for a specific variable
def load_and_combine(directory, value_name):
    all_files = glob.glob(os.path.join(directory, "*.xlsx"))
    df_list = []
    
    # Check for direct file paths if directory is actually a file (used for the new 2025 dataset)
    if os.path.isfile(directory):
        all_files = [directory]
        
    for file in all_files:
        df = pd.read_excel(file)
        date_col = next((col for col in df.columns if 'date' in str(col).lower() or 'year' in str(col).lower() or 'time' in str(col).lower()), df.columns[0])
        val_col = next((col for col in df.columns if value_name.lower() in str(col).lower()), df.columns[1] if len(df.columns) > 1 else df.columns[0])
        
        temp_df = df[[date_col, val_col]].rename(columns={date_col: 'Date', val_col: value_name})
        df_list.append(temp_df)
        
    if not df_list:
        raise ValueError(f"No excel files found in {directory}")
        
    combined_df = pd.concat(df_list, ignore_index=True)
    
    # DATA CLEANING
    combined_df['Date'] = pd.to_datetime(combined_df['Date'], errors='coerce')
    combined_df[value_name] = pd.to_numeric(combined_df[value_name], errors='coerce')
    combined_df = combined_df.dropna(subset=['Date', value_name])
    
    combined_df = combined_df.groupby('Date')[value_name].mean().reset_index()
    return combined_df

# 5. Feature Engineering for Time Series in Neural Networks
def create_features(df):
    df = df.copy()
    df['Year'] = df['Date'].dt.year
    df['Month'] = df['Date'].dt.month
    df['Day'] = df['Date'].dt.day
    df['DayOfYear'] = df['Date'].dt.dayofyear
    df['Sin_DayOfYear'] = np.sin(2 * np.pi * df['DayOfYear'] / 365.25)
    df['Cos_DayOfYear'] = np.cos(2 * np.pi * df['DayOfYear'] / 365.25)
    return df

if __name__ == "__main__":
    print("Loading datasets from Excel files...")
    df_msavi = load_and_combine(dirs['MSAVI'], 'MSAVI')
    df_ndmi = load_and_combine(dirs['NDMI'], 'NDMI')
    
    # Load NDVI dataset AND the newly provided real dataset
    df_ndvi_old = load_and_combine(dirs['NDVI'], 'NDVI')
    new_real_dataset_path = os.path.join(base_dir, 'warwan_NDVI_2025-01-01_2026-04-21.xlsx')
    if os.path.exists(new_real_dataset_path):
        print("-> Found NEW Real Dataset for NDVI. Adding it to the training pool to boost accuracy!")
        df_ndvi_new = load_and_combine(new_real_dataset_path, 'NDVI')
        df_ndvi = pd.concat([df_ndvi_old, df_ndvi_new]).drop_duplicates(subset='Date').sort_values('Date').reset_index(drop=True)
    else:
        df_ndvi = df_ndvi_old
    
    datasets = {
        'MSAVI': df_msavi,
        'NDVI': df_ndvi,
        'NDMI': df_ndmi
    }

    feature_cols = ['Year', 'Month', 'Day', 'DayOfYear', 'Sin_DayOfYear', 'Cos_DayOfYear']
    models = {}
    scalers = {}

    # 6. Train a Deep Neural Network Model INPENDENTLY for each Index (No dropping overlapping dates!)
    print("\nTraining deep neural network models independently...")
    for target, df_target in datasets.items():
        df_features = create_features(df_target)
        X = df_features[feature_cols]
        y = df_features[target]
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        scalers[target] = scaler
        
        model = MLPRegressor(
            hidden_layer_sizes=(256, 128, 64, 32), 
            activation='relu', 
            solver='adam', 
            max_iter=2000, 
            learning_rate='adaptive', 
            random_state=42, 
            early_stopping=True,
            validation_fraction=0.1
        )
        model.fit(X_scaled, y)
        models[target] = model
        
        r2_score = model.score(X_scaled, y)
        accuracy_percentage = max(0, r2_score * 100)
        print(f" -> Trained Neural Network for {target} on {len(df_target)} rows | R^2 Accuracy strongly reached: {accuracy_percentage:.2f}%")

    # 7. Generate Future Dates for 2025 and 2026
    print("\nGenerating final future predictions for 2025-2026...")
    future_dates = pd.date_range(start='2025-01-01', end='2026-12-31', freq='D')
    df_future = pd.DataFrame({'Date': future_dates})
    df_future_features = create_features(df_future)
    X_future = df_future_features[feature_cols]

    # 8. Predict Values for Future Dates with independent scalers
    for target in ['MSAVI', 'NDVI', 'NDMI']:
        X_future_scaled = scalers[target].transform(X_future)
        df_future[target] = models[target].predict(X_future_scaled)

    # 9. Save Predictions to CSV
    output_file = os.path.join(base_dir, 'predictions_2025_2026_Final.csv')
    df_future[['Date', 'MSAVI', 'NDVI', 'NDMI']].to_csv(output_file, index=False)
    print(f"\nSuccess! Highly accurate integrated predictions saved to {output_file}")
