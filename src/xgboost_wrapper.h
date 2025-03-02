#include <xgboost/c_api.h>
#include <vector>
#include <mutex>
#include <map>
#include <memory>
#include <cstdlib>
#include <algorithm>
#include <iostream>  // for std::cerr
#include <stdexcept> // for std::runtime_error

class XGBoostWrapper {
public:
    XGBoostWrapper() : booster(nullptr) {}

    bool LoadModel(const std::string& model_path) {
        std::lock_guard<std::mutex> lock(model_mutex);
        if (booster) XGBoosterFree(booster);
        return XGBoosterCreate(nullptr, 0, &booster) == 0 &&
               XGBoosterLoadModel(booster, model_path.c_str()) == 0;
    }

    std::vector<float> Predict(const std::vector<float>& input, const size_t num_features) {
        std::lock_guard<std::mutex> lock(model_mutex);
        if (!booster) {
            std::cerr << "[ERROR] Booster is not loaded. Predict failed." << std::endl;
            return {}; // Return empty vector on failure
        }
        // Get number of features from the binding layer
    // Get from first sample
        const size_t num_samples = input.size()/ num_features;      // Number of samples

        // Log the input size
        std::cerr << "[INFO] Predicting with " << input.size() << " features." << std::endl;
        std::cerr << "Sample features: [ ";
        for (size_t i = 0; i < num_features && i < input.size(); i++) {  // Changed to size_t
            std::cerr << input[i] << (i < num_features - 1 ? ", " : " ");
        }
        std::cerr << "]" << std::endl;

        // Create a vector to hold the aligned input data (no padding)
        std::vector<float> aligned_input;
        aligned_input.reserve(input.size());
        std::copy(input.begin(), input.end(), std::back_inserter(aligned_input));

        DMatrixHandle dmatrix = nullptr;
        std::vector<float> results;

        try {
            // Log the matrix creation step
            std::cerr << "[INFO] Creating DMatrix with " << num_samples << " row(s) and " << num_features << " column(s)." << std::endl;

            // Create DMatrix from input data
            if (XGDMatrixCreateFromMat(aligned_input.data(),
                                     num_samples,    // num_rows
                                     num_features,   // num_cols
                                     -1,  // missing value
                                     &dmatrix) != 0) {
                std::cerr << "[ERROR] Matrix creation failed." << std::endl;
                return {}; // Return empty vector on failure
            }

            bst_ulong out_len;
            const float* out_result;

            // Log the prediction process
            std::cerr << "[INFO] Starting prediction." << std::endl;

            if (XGBoosterPredict(booster, dmatrix, 0, 0, 0, &out_len, &out_result) != 0) {
                std::cerr << "[ERROR] Prediction failed." << std::endl;
                return {}; // Return empty vector on failure
            } else {
                std::cerr << "[INFO] Prediction succeeded, output length: " << out_len << std::endl;
                results.assign(out_result, out_result + out_len);
            }
        }
        catch (const std::exception& e) {
            std::cerr << "[ERROR] Exception during prediction: " << e.what() << std::endl;
        }
        catch (...) {
            std::cerr << "[ERROR] Unknown exception during prediction." << std::endl;
        }

        // Clean up the DMatrix handle
        if (dmatrix) XGDMatrixFree(dmatrix);

        // Return the results
        return results;
    }

    bool Train(const std::vector<float>& features, const std::vector<float>& labels, 
           const std::map<std::string, std::string>& params) {
        std::lock_guard<std::mutex> lock(model_mutex);

        if (booster) {
            XGBoosterFree(booster);
            booster = nullptr;
        }

        DMatrixHandle dtrain = nullptr;
        bool success = false;

        try {
            if (features.empty() || labels.empty() || 
                features.size() % labels.size() != 0) {
                std::cerr << "[ERROR] Invalid feature or label data." << std::endl;
                std::cerr << "Features size: " << features.size() 
                          << ", Labels size: " << labels.size() << std::endl;
                return false;
            }

            std::cerr << "[INFO] Creating DMatrix with " << labels.size() 
                      << " rows and " << (features.size() / labels.size()) << " columns." << std::endl;

            if (XGDMatrixCreateFromMat(features.data(),
                                       labels.size(),  // num_rows
                                       features.size() / labels.size(),  // num_cols
                                       -1,  // missing value
                                       &dtrain) != 0) {
                std::cerr << "[ERROR] Matrix creation for training data failed." << std::endl;
                return false;
            }

            if (XGDMatrixSetFloatInfo(dtrain, "label", labels.data(), labels.size()) != 0) {
                std::cerr << "[ERROR] Failed to set label information in DMatrix." << std::endl;
                return false;
            }

            if (XGBoosterCreate(&dtrain, 1, &booster) != 0) {
                std::cerr << "[ERROR] Booster creation failed." << std::endl;
                return false;
            }

            for (const auto& param : params) {
                if (XGBoosterSetParam(booster, param.first.c_str(), param.second.c_str()) != 0) {
                    std::cerr << "[ERROR] Failed to set parameter: " << param.first << std::endl;
                    return false;
                }
            }

            int num_rounds = 10;
            std::cerr << "[INFO] Starting training for " << num_rounds << " rounds." << std::endl;
            for (int i = 0; i < num_rounds; ++i) {
                if (XGBoosterUpdateOneIter(booster, i, dtrain) != 0) {
                    std::cerr << "[ERROR] Booster update failed at iteration " << i << std::endl;
                    return false;
                }
            }

            success = true;
        }
        catch (const std::exception& e) {
            std::cerr << "[ERROR] Exception during training: " << e.what() << std::endl;
        }
        catch (...) {
            std::cerr << "[ERROR] Unknown exception during training." << std::endl;
        }

        if (dtrain) XGDMatrixFree(dtrain);
        return success;
    }

    bool SaveModel(const std::string& path) {
        std::lock_guard<std::mutex> lock(model_mutex);
        if (!booster) {
            std::cerr << "[ERROR] Booster is not loaded. Save failed." << std::endl;
            return false;
        }
        return XGBoosterSaveModel(booster, path.c_str()) == 0;
    }

    std::vector<float> GetFeatureImportance(const std::string& importance_type = "gain") {
        std::lock_guard<std::mutex> lock(model_mutex);
        if (!booster) {
            std::cerr << "[ERROR] Booster is not loaded. Cannot get feature importance." << std::endl;
            return {}; // Return empty vector on failure
        }

        try {
            // Create JSON config string
            std::string config = "{\"importance_type\":\"" + importance_type + "\"}";
            
            // Prepare output variables
            bst_ulong out_n_features = 0;
            const char** out_features = nullptr;
            bst_ulong out_dim = 0;
            const bst_ulong* out_shape = nullptr;
            const float* out_scores = nullptr;
            
            if (XGBoosterFeatureScore(booster, config.c_str(), 
                                     &out_n_features, &out_features,
                                     &out_dim, &out_shape, 
                                     &out_scores) != 0) {
                std::cerr << "[ERROR] Failed to get feature importance." << std::endl;
                return {};
            }

            // Convert scores to float vector
            std::vector<float> importance_scores;
            importance_scores.reserve(out_n_features);
            
            for (bst_ulong i = 0; i < out_n_features; ++i) {
                importance_scores.push_back(out_scores[i]);
            }

            std::cerr << "[INFO] Retrieved " << importance_scores.size() << " feature importance scores." << std::endl;
            return importance_scores;
        }
        catch (const std::exception& e) {
            std::cerr << "[ERROR] Exception while getting feature importance: " << e.what() << std::endl;
        }
        catch (...) {
            std::cerr << "[ERROR] Unknown exception while getting feature importance." << std::endl;
        }

        return {};
    }

    // Alternative method that returns feature importance as name-value pairs
    std::map<std::string, float> GetFeatureImportanceMap(
            const std::vector<std::string>& feature_names,
            const std::string& importance_type = "gain") {
        
        std::map<std::string, float> result;
        std::vector<float> importance = GetFeatureImportance(importance_type);
        
        if (importance.empty() || feature_names.size() != importance.size()) {
            std::cerr << "[ERROR] Feature names count (" << feature_names.size() 
                      << ") doesn't match importance scores count (" 
                      << importance.size() << ")." << std::endl;
            return {};
        }
        
        for (size_t i = 0; i < importance.size(); ++i) {
            result[feature_names[i]] = importance[i];
        }
        
        return result;
    }

    ~XGBoostWrapper() {
        if (booster) XGBoosterFree(booster);
    }

private:
    BoosterHandle booster;
    std::mutex model_mutex;
};
