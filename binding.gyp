{
    "targets": [
      {
        "target_name": "xgboost_binding",
        "sources": [ "src/binding.cc" ],
        "include_dirs": [
          "<!@(node -p \"require('node-addon-api').include\")",
          "deps/xgboost-1.7.5/include"
        ],
        "libraries": [
          "-L<(module_root_dir)/lib",
          "-Wl,-rpath,'$$ORIGIN/../../lib'",
          "-lxgboost"
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
  
