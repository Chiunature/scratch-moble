#ifndef PIKA_MOBILE_H
#define PIKA_MOBILE_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct PikaMobileResult {
    int code;
    char* message;
    char* data;
    size_t data_size;
} PikaMobileResult;

PikaMobileResult pika_mobile_compile(const char* source,
                                     const char* output_path);
PikaMobileResult pika_mobile_execute(const char* source);
PikaMobileResult pika_mobile_execute_bytecode_file(const char* path);
PikaMobileResult pika_mobile_read_file(const char* path);
void pika_mobile_result_free(PikaMobileResult* result);

#ifdef __cplusplus
}
#endif

#endif
