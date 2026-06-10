import { omit, pick } from "lodash";
import {
    defaultTargetLanguages,
    getTargetLanguage,
    inferenceFlagNames,
    inferenceFlags,
    InputData,
    jsonInputForTargetLanguage,
    quicktype
} from "quicktype-core";
import { Option, Transform } from "./type";

const languageMap = new Map<string, string>();
for (const lang of defaultTargetLanguages) {
    languageMap.set(lang.displayName, lang.name);
}

const getLanguageName = (displayName: string): string => {
    return languageMap.get(displayName) || displayName;
}

const getTargetOption = (lang: string) => {
    return getTargetLanguage(getLanguageName(lang) as any).optionDefinitions.map(({name}) => name)
}

export default class implements Transform {
    getLanguages() {
        return defaultTargetLanguages.map(item => item.displayName)
            .filter(name => {
                // 禁用php quick type 支持不太完善
                return !["php"].includes(getLanguageName(name).toLowerCase())
            })
    }

    async execute(lang: string, input: string, options: Record<string, any>): Promise<string> {
        const langName = getLanguageName(lang)
        const targetOption = getTargetOption(lang)
        const jsonInput = jsonInputForTargetLanguage(langName as any);
        await jsonInput.addSource({
            name: 'ctool',
            samples: [input]
        });
        const inputData = new InputData();
        inputData.addInput(jsonInput);
        return (await quicktype({
            inputData,
            lang: langName as any,
            ...omit(options, targetOption),
            rendererOptions: pick(options, targetOption)
        })).lines.join("\n")
    }

    getOptionDefine(lang: string) {
        const define: Option[] = []
        if (lang !== "") {
            const quickTypeLanguage = getTargetLanguage(getLanguageName(lang) as any)
            define.push(...quickTypeLanguage.optionDefinitions.map((option: any) => {
                let type: Option["type"] = "string"
                if ((option as any).type === Boolean) {
                    type = "boolean"
                }
                if ((option as any).legalValues !== undefined && (option as any).type === String) {
                    type = "select"
                }
                return {
                    name: option.name,
                    description: option.description,
                    type: type,
                    value: (option as any).legalValues,
                    defaultValue: option.defaultValue
                }
            }))
            for (let item of inferenceFlagNames) {
                const stringType = ("stringType" in inferenceFlags[item] ? inferenceFlags[item].stringType : "") || ""
                if (stringType === "" || quickTypeLanguage.stringTypeMapping.has(stringType)) {
                    define.push({
                        name: item,
                        description: inferenceFlags[item].description,
                        type: "boolean",
                        defaultValue: true
                    })
                }
            }
            define.push({
                name: "allPropertiesOptional",
                description: "Make all class property optional",
                type: "boolean",
                defaultValue: false
            })
        }
        return define
    }
}
