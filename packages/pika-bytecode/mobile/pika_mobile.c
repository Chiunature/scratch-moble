#include "pika_mobile.h"

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include "PikaCompiler.h"
#include "PikaMain.h"
#include "PikaObj.h"
#include "PikaPlatform.h"
#include "PikaVM.h"

extern const unsigned char pikaModules_py_a[];
extern volatile PikaObj* __pikaMain;

static char* pika_mobile_strdup(const char* text) {
    const char* source = text == NULL ? "" : text;
    size_t len = strlen(source);
    char* copy = (char*)malloc(len + 1);
    if (copy == NULL) {
        return NULL;
    }
    memcpy(copy, source, len + 1);
    return copy;
}

static PikaMobileResult pika_mobile_result(int code,
                                           const char* message,
                                           char* data,
                                           size_t data_size) {
    PikaMobileResult result;
    result.code = code;
    result.message = pika_mobile_strdup(message);
    result.data = data;
    result.data_size = data_size;
    return result;
}

static PikaMobileResult pika_mobile_error(int code, const char* message) {
    return pika_mobile_result(code, message, NULL, 0);
}

static PikaObj* pika_mobile_new_vm(void) {
    PikaObj* vm = newNormalObj(New_PikaMain);
    if (vm == NULL) {
        return NULL;
    }
    __pikaMain = vm;
    obj_linkLibrary(vm, (uint8_t*)pikaModules_py_a);
    return vm;
}

PikaMobileResult pika_mobile_compile(const char* source,
                                     const char* output_path) {
    if (source == NULL || output_path == NULL || output_path[0] == '\0') {
        return pika_mobile_error(PIKA_RES_ERR_INVALID_PARAM,
                                 "source and output_path are required");
    }

    PIKA_RES res = pikaCompile((char*)output_path, (char*)source);
    if (res != PIKA_RES_OK) {
        return pika_mobile_error(res, "compile failed");
    }

    return pika_mobile_read_file(output_path);
}

PikaMobileResult pika_mobile_execute(const char* source) {
    if (source == NULL) {
        return pika_mobile_error(PIKA_RES_ERR_INVALID_PARAM,
                                 "source is required");
    }

    PikaObj* vm = pika_mobile_new_vm();
    if (vm == NULL) {
        return pika_mobile_error(PIKA_RES_ERR_INSUFFICIENT_RESOURCE,
                                 "failed to create PikaScript VM");
    }

    VMParameters* globals = obj_run(vm, (char*)source);
    int code = PIKA_RES_OK;
    if (globals == NULL) {
        code = PIKA_RES_ERR_RUNTIME_ERROR;
    } else if (vm->vmFrame != NULL && vm->vmFrame->error.code != PIKA_RES_OK) {
        code = vm->vmFrame->error.code;
    }

    obj_deinit(vm);
    __pikaMain = NULL;

    if (code != PIKA_RES_OK) {
        return pika_mobile_error(code, "execute failed");
    }
    return pika_mobile_result(PIKA_RES_OK, "ok", NULL, 0);
}

PikaMobileResult pika_mobile_execute_bytecode_file(const char* path) {
    if (path == NULL || path[0] == '\0') {
        return pika_mobile_error(PIKA_RES_ERR_INVALID_PARAM,
                                 "path is required");
    }

    Arg* bytecode_arg = arg_loadFile(NULL, (char*)path);
    if (bytecode_arg == NULL) {
        return pika_mobile_error(PIKA_RES_ERR_IO_ERROR,
                                 "failed to read bytecode file");
    }

    PikaObj* vm = pika_mobile_new_vm();
    if (vm == NULL) {
        arg_deinit(bytecode_arg);
        return pika_mobile_error(PIKA_RES_ERR_INSUFFICIENT_RESOURCE,
                                 "failed to create PikaScript VM");
    }

    pikaVM_runByteCode(vm, arg_getBytes(bytecode_arg));
    int code = PIKA_RES_OK;
    if (vm->vmFrame != NULL && vm->vmFrame->error.code != PIKA_RES_OK) {
        code = vm->vmFrame->error.code;
    }

    obj_deinit(vm);
    arg_deinit(bytecode_arg);
    __pikaMain = NULL;

    if (code != PIKA_RES_OK) {
        return pika_mobile_error(code, "execute bytecode failed");
    }
    return pika_mobile_result(PIKA_RES_OK, "ok", NULL, 0);
}

PikaMobileResult pika_mobile_read_file(const char* path) {
    if (path == NULL || path[0] == '\0') {
        return pika_mobile_error(PIKA_RES_ERR_INVALID_PARAM,
                                 "path is required");
    }

    FILE* file = pika_platform_fopen(path, "rb");
    if (file == NULL) {
        return pika_mobile_error(PIKA_RES_ERR_IO_ERROR, "failed to open file");
    }

    if (pika_platform_fseek(file, 0, SEEK_END) != 0) {
        pika_platform_fclose(file);
        return pika_mobile_error(PIKA_RES_ERR_IO_ERROR, "failed to seek file");
    }

    long file_size = pika_platform_ftell(file);
    if (file_size < 0) {
        pika_platform_fclose(file);
        return pika_mobile_error(PIKA_RES_ERR_IO_ERROR, "failed to size file");
    }

    if (pika_platform_fseek(file, 0, SEEK_SET) != 0) {
        pika_platform_fclose(file);
        return pika_mobile_error(PIKA_RES_ERR_IO_ERROR, "failed to rewind file");
    }

    char* data = (char*)malloc((size_t)file_size + 1);
    if (data == NULL) {
        pika_platform_fclose(file);
        return pika_mobile_error(PIKA_RES_ERR_INSUFFICIENT_RESOURCE,
                                 "failed to allocate file buffer");
    }

    size_t read_size = pika_platform_fread(data, 1, (size_t)file_size, file);
    pika_platform_fclose(file);
    if (read_size != (size_t)file_size) {
        free(data);
        return pika_mobile_error(PIKA_RES_ERR_IO_ERROR, "failed to read file");
    }

    data[read_size] = '\0';
    return pika_mobile_result(PIKA_RES_OK, "ok", data, read_size);
}

void pika_mobile_result_free(PikaMobileResult* result) {
    if (result == NULL) {
        return;
    }
    free(result->message);
    free(result->data);
    result->message = NULL;
    result->data = NULL;
    result->data_size = 0;
}
