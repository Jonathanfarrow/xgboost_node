declare module '*xgboost_binding.node' {
    export class XGBoostBinding {
        constructor();
        loadModel(path: string): boolean;
        predict(features: number[][]): Promise<number[]>;
        train(features: number[][], labels: number[], params: object): Promise<boolean>;
        saveModel(path: string): boolean;
    }
} 