package com.pikamobile

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

class PikaMobileModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun compile(source: String, outputPath: String?, promise: Promise) {
    resolveNativeResult(promise, nativeCompile(source, outputPath ?: defaultBytecodePath()))
  }

  @ReactMethod
  fun execute(source: String, promise: Promise) {
    resolveNativeResult(promise, nativeExecute(source))
  }

  @ReactMethod
  fun executeBytecode(path: String, promise: Promise) {
    resolveNativeResult(promise, nativeExecuteBytecode(path))
  }

  @ReactMethod
  fun readFile(path: String, promise: Promise) {
    resolveNativeResult(promise, nativeReadFile(path))
  }

  @ReactMethod
  fun getDefaultBytecodePath(promise: Promise) {
    promise.resolve(defaultBytecodePath())
  }

  private fun defaultBytecodePath(): String {
    return "${reactContext.filesDir.absolutePath}/pika-main.py.o"
  }

  private fun resolveNativeResult(promise: Promise, rawResult: String) {
    try {
      val json = JSONObject(rawResult)
      val map: WritableMap = Arguments.createMap()
      map.putInt("code", json.optInt("code"))
      map.putString("message", json.optString("message"))
      if (json.has("dataEncoding")) {
        map.putString("dataEncoding", json.optString("dataEncoding"))
      }
      if (json.has("data")) {
        map.putString("data", json.optString("data"))
      }
      promise.resolve(map)
    } catch (error: Exception) {
      promise.reject("PIKA_NATIVE_RESULT_ERROR", error)
    }
  }

  private external fun nativeCompile(source: String, outputPath: String): String
  private external fun nativeExecute(source: String): String
  private external fun nativeExecuteBytecode(path: String): String
  private external fun nativeReadFile(path: String): String

  companion object {
    const val NAME = "PikaMobile"

    init {
      System.loadLibrary("pika_mobile_jni")
    }
  }
}
