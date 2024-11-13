```
██╗  ██╗ ██████╗ ██████╗  ██████╗  ██████╗ ███████╗████████╗    ███╗   ██╗ ██████╗ ██████╗ ███████╗
╚██╗██╔╝██╔════╝ ██╔══██╗██╔═══██╗██╔═══██╗██╔════╝╚══██╔══╝    ████╗  ██║██╔═══██╗██╔══██╗██╔════╝
 ╚███╔╝ ██║  ███╗██████╔╝██║   ██║██║   ██║███████╗   ██║       ██╔██╗ ██║██║   ██║██║  ██║█████╗  
 ██╔██╗ ██║   ██║██╔══██╗██║   ██║██║   ██║╚════██║   ██║       ██║╚██╗██║██║   ██║██║  ██║██╔══╝  
██╔╝ ██╗╚██████╔╝██████╔╝╚██████╔╝╚██████╔╝███████║   ██║       ██║ ╚████║╚██████╔╝██████╔╝███████╗
╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝   ╚═╝       ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝
```

# XGBoost Node

Fast, native Node.js bindings for XGBoost (Linux only)

## Features
- 🚀 Native C++ bindings for maximum performance
- 🧵 Multi-threaded prediction support
- 🔄 Async/Promise-based API
- 💪 Type definitions included
- 🐧 Linux support (more platforms coming soon)

## Prerequisites
- Linux OS
- Node.js >= 14.0.0  
- GCC/G++ compiler

## Installation
```bash
npm install xgboost-node
```

## Quick Start

```typescript
import xgboost from 'xgboost-node';

// Training example
const features = [
    [1200, 8, 10, 0, 1, 1],  // Example flight data 
    [800, 14, 15, 1, 2, 0],
];
const labels = [250, 180];  // Prices

const params = {
    max_depth: 3,
    eta: 0.1,
    objective: 'reg:squarederror',
    eval_metric: 'rmse'
};

async function main() {
    // Train model
    await xgboost.train(features, labels, params);
    
    // Save the trained model
    await xgboost.saveModel('model.xgb');
    
    // Load model for predictions
    await xgboost.loadModel('model.xgb');
    
    // Make predictions
    const predictions = await xgboost.predict([[1300, 9, 11, 0, 1, 1]]);
    console.log('Predicted price:', predictions[0]);
}

main().catch(console.error);
```

## API Reference

### train(features: number[][], labels: number[], params: object): Promise<void>
Trains an XGBoost model with the provided features and labels.

**Parameters:**
- `features`: 2D array of training features
- `labels`: Array of training labels
- `params`: XGBoost parameters object

### predict(features: number[][]): Promise<number[]>
Makes predictions using the trained model.

**Parameters:**
- `features`: 2D array of features to predict

**Returns:**
- Array of predictions

### saveModel(path: string): Promise<void>
Saves the trained model to disk.

**Parameters:**
- `path`: File path to save the model

### loadModel(path: string): Promise<void>
Loads a trained model from disk.

**Parameters:**
- `path`: Path to the saved model file

## Building from Source

1. Clone the repository:
```bash
git clone https://github.com/yourusername/xgboost-node.git
```

2. Install dependencies:
```bash
npm install
```

3. Build the native module:
```bash
npm run build
```

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
MIT

### Disclaimer
This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.


## Acknowledgments
- XGBoost team for the amazing gradient boosting library
- N-API team for the native addon interface
