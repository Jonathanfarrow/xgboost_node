#include <napi.h>
#include "xgboost_wrapper.h"
#include <node_api.h>

class XGBoostBinding : public Napi::ObjectWrap<XGBoostBinding> {
private:
    std::unique_ptr<XGBoostWrapper> xgboost;
    static Napi::FunctionReference constructor;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::HandleScope scope(env);

        Napi::Function func = DefineClass(env, "XGBoostBinding", {
            InstanceMethod("loadModel", &XGBoostBinding::LoadModel),
            InstanceMethod("predict", &XGBoostBinding::Predict),
            InstanceMethod("train", &XGBoostBinding::Train),
            InstanceMethod("saveModel", &XGBoostBinding::SaveModel),
            InstanceMethod("getFeatureImportance", &XGBoostBinding::GetFeatureImportance),
        });

        constructor = Napi::Persistent(func);
        constructor.SuppressDestruct();

        exports.Set("XGBoostBinding", func);
        return exports;
    }

    XGBoostBinding(const Napi::CallbackInfo& info) 
        : Napi::ObjectWrap<XGBoostBinding>(info) {
        xgboost = std::make_unique<XGBoostWrapper>();
    }

    Napi::Value LoadModel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Model path must be a string").ThrowAsJavaScriptException();
            return env.Null();
        }

        std::string model_path = info[0].As<Napi::String>().Utf8Value();
        bool success = xgboost->LoadModel(model_path);
        return Napi::Boolean::New(env, success);
    }

    Napi::Value Predict(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        if (info.Length() < 1 || !info[0].IsArray()) {
            Napi::TypeError::New(env, "Input data must be a 2D array").ThrowAsJavaScriptException();
            return env.Null();
        }

        // Get number of features from the binding layer
       

        // Convert input data
        std::vector<float> input;
        size_t num_features = 0;
        try {
            Napi::Array inputArray = info[0].As<Napi::Array>();
             num_features = inputArray.Get((uint32_t)0).As<Napi::Array>().Length();  

            for (uint32_t i = 0; i < inputArray.Length(); i++) {
                if (!inputArray.Get(i).IsArray()) {
                    throw Napi::Error::New(env, "Expected 2D array input");
                }
                Napi::Array row = inputArray.Get(i).As<Napi::Array>();
                for (uint32_t j = 0; j < row.Length(); j++) {
                    if (!row.Get(j).IsNumber()) {
                        throw Napi::Error::New(env, "All values must be numbers");
                    }
                    input.push_back(row.Get(j).As<Napi::Number>().FloatValue());
                }
            }
        } catch (const Napi::Error& e) {
            e.ThrowAsJavaScriptException();
            return env.Null();
        }

        auto deferred = Napi::Promise::Deferred::New(env);
        
        try {
            auto prediction = xgboost->Predict(input, num_features);
            Napi::Array result = Napi::Array::New(env, prediction.size());
            for (size_t i = 0; i < prediction.size(); i++) {
                result.Set(i, Napi::Number::New(env, prediction[i]));
            }
            deferred.Resolve(result);
        } catch (const std::exception& e) {
            deferred.Reject(Napi::Error::New(env, e.what()).Value());
        }

        return deferred.Promise();
    }

    Napi::Value Train(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 3 || !info[0].IsArray() || !info[1].IsArray() || !info[2].IsObject()) {
            Napi::TypeError::New(env, "Wrong arguments").ThrowAsJavaScriptException();
            return env.Null();
        }

        // Get features
        Napi::Array featuresArray = info[0].As<Napi::Array>();
        std::vector<float> features;
        for (uint32_t i = 0; i < featuresArray.Length(); i++) {
            Napi::Array row = featuresArray.Get(i).As<Napi::Array>();
            for (uint32_t j = 0; j < row.Length(); j++) {
                features.push_back(row.Get(j).As<Napi::Number>().FloatValue());
            }
        }

        // Get labels
        Napi::Array labelsArray = info[1].As<Napi::Array>();
        std::vector<float> labels;
        for (uint32_t i = 0; i < labelsArray.Length(); i++) {
            labels.push_back(labelsArray.Get(i).As<Napi::Number>().FloatValue());
        }

        // Get parameters
        Napi::Object paramsObj = info[2].As<Napi::Object>();
        std::map<std::string, std::string> params;
        Napi::Array keys = paramsObj.GetPropertyNames();
        for (uint32_t i = 0; i < keys.Length(); i++) {
            std::string key = keys.Get(i).As<Napi::String>();
            std::string value = paramsObj.Get(key).As<Napi::String>();
            params[key] = value;
        }

        auto deferred = Napi::Promise::Deferred::New(env);

        try {
            bool success = xgboost->Train(features, labels, params);
            deferred.Resolve(Napi::Boolean::New(env, success));
        } catch (const std::exception& e) {
            deferred.Reject(Napi::Error::New(env, e.what()).Value());
        }

        return deferred.Promise();
    }

    Napi::Value SaveModel(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        if (info.Length() < 1 || !info[0].IsString()) {
            Napi::TypeError::New(env, "Path must be a string").ThrowAsJavaScriptException();
            return env.Null();
        }

        std::string path = info[0].As<Napi::String>();
        bool success = xgboost->SaveModel(path);
        return Napi::Boolean::New(env, success);
    }

    Napi::Value GetFeatureImportance(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        std::string importance_type = "gain";
        if (info.Length() > 0 && info[0].IsString()) {
            importance_type = info[0].As<Napi::String>().Utf8Value();
        }
        
        std::vector<float> importance = xgboost->GetFeatureImportance(importance_type);
        
        // Create a JavaScript array with the correct size
        Napi::Array result = Napi::Array::New(env, importance.size());
        
        // Fill the array with values
        for (size_t i = 0; i < importance.size(); i++) {
            result[i] = Napi::Number::New(env, importance[i]);
        }
        
        return result;
    }

    XGBoostWrapper* GetInternalInstance() {
        return xgboost.get();
    }
};

Napi::FunctionReference XGBoostBinding::constructor;

// Fix the module initialization
Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
    return XGBoostBinding::Init(env, exports);
}

NODE_API_MODULE(xgboost_binding, InitModule)
