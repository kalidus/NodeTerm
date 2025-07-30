{
  "targets": [
    {
      "target_name": "rdp_activex_advanced",
      "sources": [
        "src/rdp_activex_simplified.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "WIN32_LEAN_AND_MEAN",
        "NOMINMAX"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [
            "/std:c++17"
          ]
        }
      },
      "libraries": [
        "ole32.lib",
        "oleaut32.lib",
        "uuid.lib",
        "user32.lib",
        "kernel32.lib"
      ],
      "conditions": [
        [
          "OS==\"win\"",
          {
            "defines": [
              "_WIN32_WINNT=0x0601"
            ]
          }
        ]
      ]
    }
  ]
}
