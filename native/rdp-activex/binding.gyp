{
  "targets": [
    {
      "target_name": "rdp_activex_basic",
      "sources": [ "src/rdp_activex_basic.cpp" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "C:/Program Files (x86)/Windows Kits/10/Include/10.0.26100.0/um"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "libraries": [
        "-luser32.lib",
        "-lole32.lib",
        "-loleaut32.lib",
        "-luuid.lib"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": ["/EHsc"]
        }
      }
    }
  ]
} 