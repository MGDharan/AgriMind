import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, f1_score, recall_score, r2_score, mean_absolute_error
import os

def evaluate_predictions():
    # Paths
    base_dir = r'f:\Warwan'
    pred_path = os.path.join(base_dir, 'predictions_2025_2026_Clean.csv')
    real_path = os.path.join(base_dir, 'warwan_NDVI_2025-01-01_2026-04-21.xlsx')

    # Load Predictions
    print("Loading predictions...")
    if not os.path.exists(pred_path):
        print("Predictions file not found.")
        return
    df_pred = pd.read_csv(pred_path)
    df_pred['Date'] = pd.to_datetime(df_pred['Date'])
    
    # Load Real Data
    print("Loading actual real dataset...")
    df_real_raw = pd.read_excel(real_path)
    
    # Dynamically find the date column and NDVI column
    date_col = next((col for col in df_real_raw.columns if 'date' in str(col).lower() or 'time' in str(col).lower() or 'year' in str(col).lower()), df_real_raw.columns[0])
    ndvi_col = next((col for col in df_real_raw.columns if 'ndvi' in str(col).lower()), df_real_raw.columns[1] if len(df_real_raw.columns) > 1 else df_real_raw.columns[0])
    
    df_real = df_real_raw[[date_col, ndvi_col]].rename(columns={date_col: 'Date', ndvi_col: 'Actual_NDVI'})
    df_real['Date'] = pd.to_datetime(df_real['Date'], errors='coerce')
    df_real['Actual_NDVI'] = pd.to_numeric(df_real['Actual_NDVI'], errors='coerce')
    df_real.dropna(inplace=True)
    
    # Average duplicates
    df_real = df_real.groupby('Date')['Actual_NDVI'].mean().reset_index()

    # Merge pred and real
    merged = pd.merge(df_pred[['Date', 'NDVI']], df_real, on='Date', how='inner', suffixes=('_Pred', '_Actual'))
    
    if merged.empty:
        print("No overlapping dates found between predictions and the real dataset.")
        return
    
    print(f"\nEvaluating on {len(merged)} overlapping days...")
    y_true = merged['Actual_NDVI']
    y_pred = merged['NDVI']
    
    # 1. Regression Metrics
    r2 = r2_score(y_true, y_pred)
    mae = mean_absolute_error(y_true, y_pred)
    accuracy_percentage = max(0, r2 * 100) # R^2 as pseudo regression-accuracy
    print("\n--- REGRESSION PERFORMANCE ---")
    print(f"R-Squared (Accuracy Percentage): {accuracy_percentage:.2f}%")
    print(f"Mean Absolute Error: {mae:.4f}")
    
    # 2. Classification Metrics (Accuracy, F1, Recall)
    # Since NDVI is continuous, we must pick a threshold to classify "Vegetation" vs "No Vegetation".
    # Standard threshold: NDVI >= 0.2 indicates positive vegetation presence.
    threshold = 0.2
    y_true_class = (y_true >= threshold).astype(int)
    y_pred_class = (y_pred >= threshold).astype(int)
    
    acc_clf = accuracy_score(y_true_class, y_pred_class) * 100
    f1_clf = f1_score(y_true_class, y_pred_class, zero_division=0) * 100
    recall_clf = recall_score(y_true_class, y_pred_class, zero_division=0) * 100
    
    print("\n--- CLASSIFICATION PERFORMANCE (Threshold NDVI >= 0.2) ---")
    print(f"Classification Accuracy: {acc_clf:.2f}%")
    print(f"F1 Score: {f1_clf:.2f}%")
    print(f"Recall Score: {recall_clf:.2f}%")
    
if __name__ == "__main__":
    evaluate_predictions()
