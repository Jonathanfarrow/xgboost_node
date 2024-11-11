
# xgboost-node

Node.js bindings for XGBoost (Linux only)

## Prerequisites
- Linux OS
- Node.js >= 14.0.0
- GCC/G++ compiler

## Installation
npm install xgboost-node

typescript
import xgboost from 'xgboost-node';
// Training example
const features = [
[1200, 8, 10, 0, 1, 1], // Example flight data
[800, 14, 15, 1, 2, 0],
];
const labels = [250, 180]; // Prices
const params = {
max_depth: 3,
eta: 0.1,
objective: 'reg:squarederror',
eval_metric: 'rmse'
};
// Train
await xgboost.train(features, labels, params);
// Save model
xgboost.saveModel('model.xgb');
// Predict
const predictions = await xgboost.predict([[1300, 9, 11, 0, 1, 1]]);
console.log('Predicted price:', predictions[0]);



## API
### train(features: number[][], labels: number[], params: object)
### predict(features: number[][])
### saveModel(path: string)
### loadModel(path: string)