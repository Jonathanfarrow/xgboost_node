declare module '*.node' {
    interface XGBoostNative {
        /**
         * Load a model from the specified path.
         * @param path - Path to the model file.
         * @returns true if the model was loaded successfully, false otherwise.
         */
        loadModel(path: string): boolean;

        /**
         * Make a prediction based on the provided feature array.
         * @param features - A 2D array of numerical feature values.
         * @returns An array of predictions.
         */
        predict(features: number[][]): Promise<number[]>;

        /**
         * Train the model with the provided features, labels, and parameters.
         * @param features - A 2D array of feature values.
         * @param labels - An array of label values.
         * @param params - An object of training parameters.
         * @returns true if training was successful, false otherwise.
         */
        train(features: number[][], labels: number[], params: Record<string, string>): Promise<boolean>;

        /**
         * Save the currently loaded model to the specified path.
         * @param path - Path to save the model file.
         * @returns true if the model was saved successfully, false otherwise.
         */
        saveModel(path: string): boolean;

        /**
         * Unload the currently loaded model.
         * @returns true if the model was unloaded successfully, false otherwise.
         */
        unloadModel(): boolean;
    }

    const content: XGBoostNative;
    export default content;
}
