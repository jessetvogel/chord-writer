namespace Parser {

    type TokenType = 'separator' | 'text' | 'whitespace' | 'newline' | 'end'
    type Token = { type: TokenType, data: string }

    type ExpressionType = 'text' | 'bold' | 'italic' | 'bolditalic' | 'header' | 'link' | 'newline'
    type Expression = { type: ExpressionType, data: string }

    const SEPARATORS = ['[', ']', '(', ')', '*', '**', '***', '_', '__', '___', '#', '##', '###'];

    class Lexer {
        input: string;
        index: number;
        buffer: string;
        token: Token;

        constructor(input: string) {
            this.input = input;
            this.index = 0;
            this.buffer = '';
            this.token = { type: null, data: null };
        }

        getToken(): Token {
            while (true) {
                // End of input
                if (this.index >= this.input.length) {
                    if (this.buffer.length == 0) return { type: 'end', data: null };
                    if (this.tokenize(this.buffer)) {
                        const token = this.makeToken();
                        this.buffer = '';
                        return token;
                    }

                    throw `unknown token ${this.buffer}`;
                }

                // Get new character
                const c = this.input[this.index++];
                // Enlarge buffer
                this.buffer += c;
                // If we can tokenize, just continue
                if (this.tokenize(this.buffer)) continue;
                // If we also did not tokenize before, hope it will make sense later
                if (this.token.type == null) continue;
                // Return the last valid token
                const token = this.makeToken();
                this.buffer = c;
                this.tokenize(this.buffer);
                return token;
            }
        }

        makeToken(): Token {
            if (this.token.type == null)
                throw `failed to create token from ${this.buffer}`;

            const token = this.token;
            this.token = { type: null, data: null };
            return token;
        }

        tokenize(str: string): boolean {
            let type: TokenType;
            if (SEPARATORS.includes(str)) type = 'separator';
            else if (str == '\n') type = 'newline';
            else if (/^[^\S\r\n]+$/.test(str)) type = 'whitespace';
            else if (/^[^\W_]+'*$/.test(str)) type = 'text';
            else if (str.length == 1) type = 'text'; // special characters
            else return false;

            this.token.type = type;
            this.token.data = str;
            return true;
        }
    }

    export class Parser {
        lexer: Lexer;
        currentToken: Token;

        constructor(input: string) {
            this.lexer = new Lexer(input);
            this.currentToken = null;
        }

        nextToken(): void {
            this.currentToken = this.lexer.getToken();
            // if (this.currentToken.type == 'whitespace')
            // this.nextToken();
        }

        found(type: TokenType = null, data: string = null): boolean {
            if (this.currentToken == null)
                this.nextToken();

            if (type == null) return true;
            if (this.currentToken.type == type && (data == null || this.currentToken.data == data)) return true;

            return false;
        }

        consume(type: TokenType = null, data: string = null): Token {
            if (this.found(type, data)) {
                const token = this.currentToken;;
                this.currentToken = null;
                return token;
            }
            else {
                throw `expected ${data} but found ${this.currentToken.data}`;
            }
        }

        parse(): Expression[] {
            const data: Expression[] = [];
            while (!this.found('end')) {

                if (this.found('text')) {
                    data.push(this.parseText());
                    continue;
                }

                if (this.found('whitespace')) {
                    data.push({ type: 'text', data: this.consume().data });
                    continue;
                }

                if (this.found('newline')) {
                    data.push({ type: 'newline', data: this.consume().data });
                    continue;
                }

                if (
                    this.found('separator', '*') ||
                    this.found('separator', '**') ||
                    this.found('separator', '***') ||
                    this.found('separator', '_') ||
                    this.found('separator', '__') ||
                    this.found('separator', '___')
                ) {
                    data.push(this.parseMarked());
                    continue;
                }

                if (
                    this.found('separator', '#') ||
                    this.found('separator', '##') ||
                    this.found('separator', '###')
                ) {
                    data.push(this.parseHeader());
                    continue;
                }

                if (this.found('separator', '[')) {
                    data.push(this.parseLink());
                    continue;
                }

                data.push({ type: 'text', data: this.consume().data });
            }

            return data;
        }

        parseLink(): Expression {
            let data = '';
            this.consume('separator', '[');
            while (this.found('text') || this.found('whitespace'))
                data += this.consume().data;
            this.consume('separator', ']');
            return { type: 'link', data: data };
        }

        parseMarked(): Expression {
            const prefix = this.consume('separator').data;
            let data = '';
            while (this.found('text') || this.found('whitespace'))
                data += this.consume().data;
            this.consume('separator', prefix);

            if (prefix == '*' || prefix == '__')
                return { type: 'bold', data: data };
            if (prefix == '**' || prefix == '_')
                return { type: 'italic', data: data };
            if (prefix == '***' || prefix == '___')
                return { type: 'bolditalic', data: data };

            throw `unknown prefix ${prefix}`;
        }

        parseText(): Expression {
            return {
                type: 'text',
                data: this.consume('text').data
            };
        }

        parseHeader(): Expression {
            this.consume('separator'); // #

            let data = '';
            while (this.found('whitespace'))
                this.consume();
            while (this.found('text') || this.found('whitespace'))
                data += this.consume().data;

            return { type: 'header', data: data };
        }
    }
}
