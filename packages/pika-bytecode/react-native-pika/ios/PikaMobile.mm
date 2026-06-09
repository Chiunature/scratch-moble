#import "PikaMobile.h"

#import <Foundation/Foundation.h>

#include "pika_mobile.h"

@implementation PikaMobile

RCT_EXPORT_MODULE(PikaMobile)

static NSDictionary* PikaResultToDictionary(PikaMobileResult result) {
  NSMutableDictionary* payload = [NSMutableDictionary dictionary];
  payload[@"code"] = @(result.code);
  payload[@"message"] = result.message == NULL ? @"" : [NSString stringWithUTF8String:result.message];

  if (result.data != NULL) {
    NSString* data = [[NSString alloc] initWithBytes:result.data
                                             length:result.data_size
                                           encoding:NSUTF8StringEncoding];
    if (data == nil) {
      NSData* rawData = [NSData dataWithBytes:result.data length:result.data_size];
      data = [rawData base64EncodedStringWithOptions:0];
      payload[@"dataEncoding"] = @"base64";
    } else {
      payload[@"dataEncoding"] = @"utf8";
    }
    payload[@"data"] = data;
  }

  pika_mobile_result_free(&result);
  return payload;
}

RCT_REMAP_METHOD(compile,
                 compile:(NSString*)source
                 outputPath:(NSString*)outputPath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString* resolvedOutputPath = outputPath;
  if (resolvedOutputPath == nil || resolvedOutputPath.length == 0) {
    NSString* documents = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
    resolvedOutputPath = [documents stringByAppendingPathComponent:@"pika-main.py.o"];
  }

  PikaMobileResult result = pika_mobile_compile(source.UTF8String, resolvedOutputPath.UTF8String);
  resolve(PikaResultToDictionary(result));
}

RCT_REMAP_METHOD(execute,
                 execute:(NSString*)source
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  PikaMobileResult result = pika_mobile_execute(source.UTF8String);
  resolve(PikaResultToDictionary(result));
}

RCT_REMAP_METHOD(executeBytecode,
                 executeBytecode:(NSString*)path
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  PikaMobileResult result = pika_mobile_execute_bytecode_file(path.UTF8String);
  resolve(PikaResultToDictionary(result));
}

RCT_REMAP_METHOD(readFile,
                 readFile:(NSString*)path
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  PikaMobileResult result = pika_mobile_read_file(path.UTF8String);
  resolve(PikaResultToDictionary(result));
}

RCT_REMAP_METHOD(getDefaultBytecodePath,
                 getDefaultBytecodePathWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString* documents = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
  resolve([documents stringByAppendingPathComponent:@"pika-main.py.o"]);
}

@end
