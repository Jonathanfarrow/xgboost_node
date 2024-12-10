{
    "targets": [
      {
        "target_name": "xgboost_binding",
        "sources": [ "src/binding.cc" ],
        "include_dirs": [
          "<!@(node -p \"require('node-addon-api').include\")",
          "deps/xgboost-1.7.5/include",
          "deps/xgboost-1.7.5/dmlc-core/include",
          "deps/xgboost-1.7.5/rabit/include"
        ],
        "conditions": [
          ['OS=="mac"', {
            "libraries": [
              "-L<(module_root_dir)/lib",
              "-lxgboost"
            ],
            "xcode_settings": {
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "MACOSX_DEPLOYMENT_TARGET": "10.15",
              "OTHER_LDFLAGS": [
                "-Wl,-rpath,@loader_path"
              ]
            }
          }],
          ['OS=="linux"', {
            "libraries": [
              "-L<(module_root_dir)/lib",
              "-Wl,-rpath,'$$ORIGIN'",
              "-lxgboost"
            ]
          }]
        ],
        "dependencies": [
          "<!(node -p \"require('node-addon-api').gyp\")"
        ],
        "defines": [ "NAPI_CPP_EXCEPTIONS" ],
        "cflags!": [ "-fno-exceptions" ],
        "cflags_cc!": [ "-fno-exceptions" ],
        "cflags": [ "-fexceptions" ],
        "cflags_cc": [ "-fexceptions" ]
      }
    ]
  }
  
