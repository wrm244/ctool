/**
 * 算法来源 @link https://github.com/leizelong/binary
 */

export const lengthLists = [2 ** 3, 2 ** 4, 2 ** 5, 2 ** 6, 2 ** 7, 2 ** 8, 2 ** 9, 2 ** 10, 2 ** 11, 2 ** 12]

export type GenerateType = "trueForm" | "inverse" | "complement"

class Transform {
    private readonly input: string;
    private readonly length: number;

    constructor(input: string, length: number) {
        if (!/^[0-9+-]+$/.test(input)) {
            throw new Error("input error")
        }
        if (!lengthLists.includes(length)) {
            throw new Error("length error")
        }
        this.input = input;
        this.length = length;
        this.check()
    }

    isNegative() {
        return this.input[0] === "-";
    }

    getNumberString() {
        return ["+", "-"].includes(this.input[0]) ? this.input.slice(1) : this.input
    }

    number() {
        const value = BigInt(`${this.isNegative() ? `-` : ``}${this.getNumberString()}`)
        // 统一处理 +0/-0，避免 -0 被编码成负数形式。
        return value === 0n ? 0n : value
    }

    check() {
        if (this.getNumberString() === "0") {
            return;
        }
        const max = 2n ** BigInt(this.length - 1) - 1n
        const min = -1n * (2n ** BigInt(this.length - 1))
        if (
            this.number() > max || this.number() < min
        ) {
            throw new Error(`length:${this.length} input:${min} ~ ${max}`)
        }
    }

    trueForm() {
        const number = this.number()
        const two = (number < 0n ? -number : number).toString(2)
        if (number >= 0n) {
            return two.padStart(this.length, '0')
        }
        return '1' + two.padStart(this.length - 1, '0')
    }

    inverse() {
        const trueForm = this.trueForm();
        if (this.number() >= 0n) {
            return trueForm;
        }
        return trueForm[0] + trueForm.slice(1).replace(/[01]/g, item => item === '0' ? '1' : '0')
    }

    complement() {
        const number = this.number()
        if (number >= 0n) {
            return number.toString(2).padStart(this.length, '0')
        }
        const bits = BigInt(this.length)
        return ((1n << bits) - (-number)).toString(2).padStart(this.length, '0')
    }
}


export const generate = (input: string, length: number, type: GenerateType) => (new Transform(input, length))[type]()
