import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const customRequire = createRequire(import.meta.url);


// Set LD_LIBRARY_PATH before loading the native module
const libPath = path.resolve(__dirname, '../../lib');
process.env.LD_LIBRARY_PATH = `${libPath}:${process.env.LD_LIBRARY_PATH || ''}`;

// Fix: Go up two levels from dist/lib to reach project root
const modulePath = path.resolve(__dirname, './xgboost_binding.node');
console.log('Loading native module from:', modulePath);

// Import native module
const xgboostNative = customRequire(modulePath);
const binding = new xgboostNative.XGBoostBinding();

class XGBoostModel {
  private modelLoaded: boolean;

  constructor() {
    this.modelLoaded = false;
  }

  /**
   * Load a pre-trained XGBoost model from a file.
   * @param modelPath - Path to the saved model file.
   * @throws {Error} if the model cannot be loaded.
   */
  loadModel(modelPath: string): void {
    if (!modelPath) {
      throw new Error("Model path must be provided.");
    }

    const absolutePath = path.resolve(modelPath);
    const success: boolean = binding.loadModel(absolutePath);

    if (!success) {
      throw new Error(`Failed to load model from ${absolutePath}`);
    }

    this.modelLoaded = true;
    console.log(`Model loaded successfully from ${absolutePath}`);
  }

  /**
   * Make predictions using the loaded model.
   * @param features - An array of numerical feature values.
   * @returns An array of predictions.
   * @throws {Error} if no model is loaded or input is invalid.
   */
  async predict(features: number[][]): Promise<number[]> {
    if (!this.modelLoaded) {
        throw new Error("Model not loaded. Please load a model before making predictions.");
    }

    if (!Array.isArray(features) || !Array.isArray(features[0])) {
        throw new TypeError("Features must be a 2D array of numbers.");
    }

    // Ensure all elements are numbers
    for (const row of features) {
        if (row.some(isNaN)) {
            throw new TypeError("All feature values must be numbers.");
        }
    }

    // Debug: Log the shape and first few entries of the input features
    console.log("Predicting with", features.length, "samples, each having", features[0].length, "features.");
    console.log("Sample features:", features[0]);

    // Call to the binding layer for prediction
    const prediction = await binding.predict(features);

    // Debug: Log the prediction result to check its validity
    console.log("Prediction result:", prediction);

    if (!prediction || !Array.isArray(prediction)) {
        throw new Error("Prediction failed. The result is invalid.");
    }

    return prediction;
}


  /**
   * Unload the current model, if loaded, to free resources.
   */
  unloadModel(): void {
    if (this.modelLoaded) {
      binding.unloadModel();
      this.modelLoaded = false;
      console.log("Model unloaded successfully.");
    }
  }

  /**
   * Train a new XGBoost model
   */
  async train(features: number[][], labels: number[], params: XGBoostParameters): Promise<void> {
    // Validate inputs
    if (!Array.isArray(features)) {
      throw new Error('Features must be an array');
    }

    if (!Array.isArray(labels)) {
      throw new Error('Labels must be an array');
    }

    // Validate each feature row is an array
    for (let i = 0; i < features.length; i++) {
      if (!Array.isArray(features[i])) {
        throw new Error(`Feature row ${i} must be an array`);
      }
    }

    // Convert all parameters to strings, skipping undefined values
    const stringParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {  // Only add defined values
        stringParams[key] = value.toString();
      }
    }

    // Call native train method
    const success = await binding.train(features, labels, stringParams);

    if (!success) {
      throw new Error('Training failed');
    }

    this.modelLoaded = true;
  }

  /**
   * Save the trained model to a file
   * @param path - Path where to save the model
   * @throws {Error} if saving fails or no model is loaded
   */
  saveModel(path: string): void {
    if (!this.modelLoaded) {
      throw new Error("No model loaded to save");
    }

    if (!path) {
      throw new Error("Save path must be provided");
    }

    const success = binding.saveModel(path);
    if (!success) {
      throw new Error(`Failed to save model to ${path}`);
    }
  }
}

// Define parameter interface
export interface XGBoostParameters {
  max_depth?: number;
  eta?: number;
  objective?: string;
  eval_metric?: string;
  num_round?: number;
  [key: string]: string | number | undefined;
}

// Export default instance
export default new XGBoostModel();