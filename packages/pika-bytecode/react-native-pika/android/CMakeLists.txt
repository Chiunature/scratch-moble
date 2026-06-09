cmake_minimum_required(VERSION 3.13)
project(react_native_pika)

set(CMAKE_C_STANDARD 99)
set(CMAKE_CXX_STANDARD 17)

# Yarn workspace 下 android/ 经 node_modules 符号链接解析时，需 REALPATH 才能定位 pika-bytecode 根目录。
get_filename_component(_PIKA_ANDROID_DIR "${CMAKE_CURRENT_LIST_DIR}" REALPATH)
get_filename_component(_PIKA_RN_PKG_DIR "${_PIKA_ANDROID_DIR}/.." REALPATH)
get_filename_component(PIKA_ROOT "${_PIKA_RN_PKG_DIR}/.." REALPATH)

if(NOT EXISTS "${PIKA_ROOT}/pikascript/pikascript-core/PikaCompiler.c")
    message(FATAL_ERROR "PIKA_ROOT is invalid: ${PIKA_ROOT}")
endif()

add_definitions(
        -DPIKA_CONFIG_ENABLE
        -DCROSS_BUILD
        -DPIKA_LINUX_COMPATIBLE=1
)

file(GLOB PIKA_CORE_SOURCES "${PIKA_ROOT}/pikascript/pikascript-core/*.c")
file(GLOB PIKA_STDLIB_SOURCES "${PIKA_ROOT}/pikascript/pikascript-lib/PikaStdLib/*.c")
file(GLOB PIKA_API_SOURCES "${PIKA_ROOT}/pikascript/pikascript-api/*.c")

add_library(pikascript_mobile_core STATIC
        ${PIKA_CORE_SOURCES}
        ${PIKA_STDLIB_SOURCES}
        ${PIKA_API_SOURCES}
        "${PIKA_ROOT}/mobile/pika_mobile.c"
)

target_include_directories(pikascript_mobile_core PUBLIC
        "${PIKA_ROOT}"
        "${PIKA_ROOT}/mobile"
        "${PIKA_ROOT}/pikascript/pikascript-core"
        "${PIKA_ROOT}/pikascript/pikascript-api"
        "${PIKA_ROOT}/pikascript/pikascript-lib/PikaStdLib"
)

add_library(pika_mobile_jni SHARED
        src/main/cpp/PikaMobileJni.cpp
)

target_include_directories(pika_mobile_jni PRIVATE
        "${PIKA_ROOT}/mobile"
)

find_library(log-lib log)

target_link_libraries(pika_mobile_jni
        pikascript_mobile_core
        ${log-lib}
)
