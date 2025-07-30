#include <napi.h>
#include <windows.h>
#include <string>

class RdpBasicWrapper {
private:
    HWND m_window;
    bool m_initialized;

public:
    RdpBasicWrapper() : m_window(nullptr), m_initialized(false) {}

    ~RdpBasicWrapper() {
        if (m_window) {
            DestroyWindow(m_window);
        }
    }

    bool Initialize(HWND parentWindow) {
        // Crear una ventana básica para demostrar
        m_window = CreateWindowExA(
            0,
            "Static",
            "RDP Control Placeholder",
            WS_CHILD | WS_VISIBLE | WS_BORDER,
            0, 0, 800, 600,
            parentWindow,
            nullptr,
            GetModuleHandle(nullptr),
            nullptr
        );

        if (!m_window) {
            return false;
        }

        m_initialized = true;
        return true;
    }

    bool Connect(const std::string& server, const std::string& username, const std::string& password) {
        if (!m_initialized) return false;

        // Simular conexión (por ahora solo muestra un mensaje)
        SetWindowTextA(m_window, "Conectando...");
        
        // Aquí iría la lógica real de conexión RDP
        // Por ahora solo retornamos true para demostrar
        return true;
    }

    void Disconnect() {
        if (m_window) {
            SetWindowTextA(m_window, "Desconectado");
        }
    }

    void Resize(int x, int y, int width, int height) {
        if (m_window) {
            SetWindowPos(m_window, nullptr, x, y, width, height, SWP_NOZORDER);
        }
    }

    bool IsConnected() {
        // Simular estado de conexión
        return m_initialized;
    }

    std::string GetStatus() {
        if (!m_window) return "Not initialized";
        
        char text[256];
        GetWindowTextA(m_window, text, 256);
        return std::string(text);
    }
};

// Wrapper para N-API
class RdpBasicAddon : public Napi::ObjectWrap<RdpBasicAddon> {
private:
    RdpBasicWrapper* m_wrapper;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "RdpBasicWrapper", {
            InstanceMethod("initialize", &RdpBasicAddon::Initialize),
            InstanceMethod("connect", &RdpBasicAddon::Connect),
            InstanceMethod("disconnect", &RdpBasicAddon::Disconnect),
            InstanceMethod("resize", &RdpBasicAddon::Resize),
            InstanceMethod("isConnected", &RdpBasicAddon::IsConnected),
            InstanceMethod("getStatus", &RdpBasicAddon::GetStatus),
        });

        exports.Set("RdpBasicWrapper", func);
        return exports;
    }

    RdpBasicAddon(const Napi::CallbackInfo& info) : Napi::ObjectWrap<RdpBasicAddon>(info), m_wrapper(nullptr) {
        m_wrapper = new RdpBasicWrapper();
    }

    ~RdpBasicAddon() {
        if (m_wrapper) {
            delete m_wrapper;
        }
    }

    Napi::Value Initialize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Se requiere el handle de la ventana padre").ThrowAsJavaScriptException();
            return env.Null();
        }

        // Convertir BigInt a uint64_t de forma segura
        Napi::BigInt bigInt = info[0].As<Napi::BigInt>();
        bool lossless;
        uint64_t parentHandle = bigInt.Uint64Value(&lossless);
        HWND parentWindow = (HWND)(uintptr_t)parentHandle;

        bool success = m_wrapper->Initialize(parentWindow);
        return Napi::Boolean::New(env, success);
    }

    Napi::Value Connect(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 3) {
            Napi::TypeError::New(env, "Se requieren server, username y password").ThrowAsJavaScriptException();
            return env.Null();
        }

        std::string server = info[0].As<Napi::String>().Utf8Value();
        std::string username = info[1].As<Napi::String>().Utf8Value();
        std::string password = info[2].As<Napi::String>().Utf8Value();

        bool success = m_wrapper->Connect(server, username, password);
        return Napi::Boolean::New(env, success);
    }

    Napi::Value Disconnect(const Napi::CallbackInfo& info) {
        m_wrapper->Disconnect();
        return info.Env().Undefined();
    }

    Napi::Value Resize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 4) {
            Napi::TypeError::New(env, "Se requieren x, y, width, height").ThrowAsJavaScriptException();
            return env.Null();
        }

        int x = info[0].As<Napi::Number>().Int32Value();
        int y = info[1].As<Napi::Number>().Int32Value();
        int width = info[2].As<Napi::Number>().Int32Value();
        int height = info[3].As<Napi::Number>().Int32Value();

        m_wrapper->Resize(x, y, width, height);
        return env.Undefined();
    }

    Napi::Value IsConnected(const Napi::CallbackInfo& info) {
        bool connected = m_wrapper->IsConnected();
        return Napi::Boolean::New(info.Env(), connected);
    }

    Napi::Value GetStatus(const Napi::CallbackInfo& info) {
        std::string status = m_wrapper->GetStatus();
        return Napi::String::New(info.Env(), status);
    }
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return RdpBasicAddon::Init(env, exports);
}

NODE_API_MODULE(rdp_activex_basic, Init) 