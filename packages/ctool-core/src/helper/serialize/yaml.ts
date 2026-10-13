// js-yaml 5 API：BigInt 支持（超大整数解析为 BigInt，序列化时识别 BigInt）
// https://github.com/nodeca/js-yaml/issues/614
import { CORE_SCHEMA, defineScalarTag, dump as yamlDump, load as yamlLoad, NOT_RESOLVED } from "js-yaml";

// 与 js-yaml 5 内置 intCoreTag 一致的匹配模式
const YAML_INTEGER_IMPLICIT_PATTERN = /^(?:0o[0-7]+|0x[0-9a-fA-F]+|[-+]?[0-9]+)$/;
const YAML_INTEGER_EXPLICIT_PATTERN = /^(?:[-+]?0b[0-1]+|[-+]?0o[0-7]+|[-+]?0x[0-9a-fA-F]+|[-+]?[0-9]+)$/;

// 自定义 int tag：安全整数返回 number，超出范围返回 BigInt
const BigIntType = defineScalarTag<number | bigint>("tag:yaml.org,2002:int", {
    implicit: true,
    implicitFirstChars: ["-", "+", ..."0123456789"],
    resolve: (source: string) => {
        if (!YAML_INTEGER_IMPLICIT_PATTERN.test(source) && !YAML_INTEGER_EXPLICIT_PATTERN.test(source)) {
            return NOT_RESOLVED;
        }
        const value = source.replace(/_/g, "");
        const numberValue = Number(value);
        if (Number.isSafeInteger(numberValue)) {
            return numberValue;
        }
        try {
            return BigInt(value);
        } catch {
            return NOT_RESOLVED;
        }
    },
    identify: (object: unknown) =>
        typeof object === "bigint" ||
        (typeof object === "number" && Number.isInteger(object) && !Object.is(object, -0) && object.toString(10).indexOf("e") < 0),
    represent: (object) => (object as number | bigint).toString(10),
});

const SCHEMA = CORE_SCHEMA.withTags(BigIntType);

export default {
    dump: (data: any) => {
        return yamlDump(data, { schema: SCHEMA });
    },
    load: (data: string) => {
        return yamlLoad(data, { schema: SCHEMA });
    },
};
