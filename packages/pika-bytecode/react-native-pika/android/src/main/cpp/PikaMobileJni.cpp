#include <jni.h>

#include <cstdio>
#include <cstring>
#include <sstream>
#include <string>

#include "pika_mobile.h"

static std::string jstringToString(JNIEnv* env, jstring value) {
    if (value == nullptr) {
        return "";
    }
    const char* chars = env->GetStringUTFChars(value, nullptr);
    std::string result = chars == nullptr ? "" : chars;
    if (chars != nullptr) {
        env->ReleaseStringUTFChars(value, chars);
    }
    return result;
}

static void appendJsonString(std::ostringstream& out,
                             const char* data,
                             size_t size) {
    out << '"';
    if (data != nullptr) {
        for (size_t i = 0; i < size; ++i) {
            unsigned char c = static_cast<unsigned char>(data[i]);
            switch (c) {
                case '"':
                    out << "\\\"";
                    break;
                case '\\':
                    out << "\\\\";
                    break;
                case '\b':
                    out << "\\b";
                    break;
                case '\f':
                    out << "\\f";
                    break;
                case '\n':
                    out << "\\n";
                    break;
                case '\r':
                    out << "\\r";
                    break;
                case '\t':
                    out << "\\t";
                    break;
                default:
                    if (c < 0x20) {
                        char escaped[7];
                        std::snprintf(escaped, sizeof(escaped), "\\u%04x", c);
                        out << escaped;
                    } else {
                        out << static_cast<char>(c);
                    }
                    break;
            }
        }
    }
    out << '"';
}

static void appendHexString(std::ostringstream& out,
                            const char* data,
                            size_t size) {
    static const char* hex = "0123456789abcdef";
    out << '"';
    if (data != nullptr) {
        for (size_t i = 0; i < size; ++i) {
            unsigned char c = static_cast<unsigned char>(data[i]);
            out << hex[(c >> 4) & 0x0f] << hex[c & 0x0f];
        }
    }
    out << '"';
}

static jstring resultToJson(JNIEnv* env, PikaMobileResult result) {
    std::ostringstream out;
    out << "{\"code\":" << result.code << ",\"message\":";
    appendJsonString(out, result.message, result.message == nullptr ? 0 : std::strlen(result.message));
    if (result.data != nullptr) {
        out << ",\"dataEncoding\":\"hex\",\"data\":";
        appendHexString(out, result.data, result.data_size);
    }
    out << "}";
    std::string json = out.str();
    pika_mobile_result_free(&result);
    return env->NewStringUTF(json.c_str());
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_pikamobile_PikaMobileModule_nativeCompile(JNIEnv* env,
                                                   jobject,
                                                   jstring source,
                                                   jstring outputPath) {
    std::string sourceValue = jstringToString(env, source);
    std::string outputPathValue = jstringToString(env, outputPath);
    return resultToJson(env, pika_mobile_compile(sourceValue.c_str(), outputPathValue.c_str()));
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_pikamobile_PikaMobileModule_nativeExecute(JNIEnv* env,
                                                   jobject,
                                                   jstring source) {
    std::string sourceValue = jstringToString(env, source);
    return resultToJson(env, pika_mobile_execute(sourceValue.c_str()));
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_pikamobile_PikaMobileModule_nativeExecuteBytecode(JNIEnv* env,
                                                           jobject,
                                                           jstring path) {
    std::string pathValue = jstringToString(env, path);
    return resultToJson(env, pika_mobile_execute_bytecode_file(pathValue.c_str()));
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_pikamobile_PikaMobileModule_nativeReadFile(JNIEnv* env,
                                                    jobject,
                                                    jstring path) {
    std::string pathValue = jstringToString(env, path);
    return resultToJson(env, pika_mobile_read_file(pathValue.c_str()));
}
