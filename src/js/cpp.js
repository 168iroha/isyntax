/* ISyntax C++ 0.11.0 */

	ISyntax.cpp = ISyntax.cpp || {};
	ISyntax.cpp.language = 'C++';

	// 識別子のテーブル
	ISyntax.cpp.ident_table = {
		// 型関係
		type:[
			'auto', 'bool', 'char', 'char8_t', 'char16_t', 'char32_t', 'class'
			, 'concept', 'const', 'constexpr', 'decltype', 'double', 'enum'
			, 'false', 'float', 'inline', 'int', 'long', 'nullptr', 'register'
			, 'short', 'signed', 'sizeof', 'static', 'struct', 'thread_local'
			, 'true', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using'
			, 'void', 'volatile', 'wchar_t'
		]
		// 制御関係
		, control:[
			'catch', 'do', 'else', 'for', 'goto', 'if', 'static_assert', 'switch', 'throw'
			, 'try', 'while'
		]
		// その他予約語
		, keyword:[
			'break', 'case', 'const_cast', 'consteval', 'constinit', 'continue', 'co_await', 'co_return'
			, 'co_yield ', 'default', 'delete', 'dynamic_cast', 'explicit', 'export', 'extern', 'friend', 'mutable'
			, 'namespace', 'new', 'noexcept', 'operator', 'private', 'protected', 'public', 'reinterpret_cast'
			, 'requires', 'return', 'static_cast', 'template', 'this', 'virtual'
		]
	};

	// 解析済みテキストへの追記(size:新たな解析済みテキストのサイズ)
	ISyntax.cpp.add_analyzed_text = function(line, size, style = '') {
		if (style == '') line[1][line[0]] += ISyntax.escape_html(line[2].substr(0, size));
		else line[1][line[0]] += '<span class="' + style + '">' + ISyntax.escape_html(line[2].substr(0, size)) + '</span>';
		line[2] = line[2].substr(size);
	};
	// 次の行に走査対象を移す(戻り値がfalseであれば終端を示す)
	ISyntax.cpp.next_line = function(line) {
		// 解析対象のテキストが残っていたら追記
		if ((line[0] >= 0) && (line[0] < line[1].length)) {
			line[1][line[0]] += line[2];
			line[2] = '';
			++line[0];
		}
		//else line[0] = 0;		// 何で書いたんだっけ？
		// 行数を超過したらこれ以上の操作はしない
		if (line[1].length <= line[0]) return false;
		// 分割の目印
		const temp = line[1][line[0]].search(/\S/g);
		if (temp == -1) {
			line[2] = '';
		}
		else if (temp == 0) {
			line[2] = line[1][line[0]];
			line[1][line[0]] = '';
		}
		else {
			// 解析対象と解析済みの対象で分ける
			line[2] = line[1][line[0]].substr(temp);
			line[1][line[0]] = line[1][line[0]].substr(0, temp);
		}
		return true;
	};
	// 現在の行を全て解析済みテキストにする
	ISyntax.cpp.next_line_token = function(line) {
		line[1][line[0]] += line[2];
		line[2] = '';
	};
	// 現在の行の次のトークンの始端へと走査対象を移す(size:前のトークンのサイズ)
	ISyntax.cpp.next_token = function(line, size, style = '') {
		if (size > 0) ISyntax.cpp.add_analyzed_text(line, size, style);
		// 行からトークンを取得しようとすることが可能であるならば取得しようとする
		if (line[2].length > 0) {
			const temp = line[2].search(/\S/g);
			// 次のトークンが取得できなかった現在の行に全て追記
			if (temp == -1) ISyntax.cpp.next_line_token(line);
			else {
				// 解析済みテキストに追記
				if (temp != 0) ISyntax.cpp.add_analyzed_text(line, temp);
			}
		}
	};
	// 接尾辞の解析
	ISyntax.cpp.parse_suffix = function(line) {
		// 接尾辞の解析(識別子に同じ)
		if (line[2].length == 0) return;
		const suffix = line[2].match(/^((?:[a-zA-Z_]|\\u[\da-fA-F]{4})(?:\w|\\u[\da-fA-F]{4}|\\U[\da-fA-F]{8})*)/);
		// 接尾辞が存在しなければ次の解析
		if (suffix == null) ISyntax.cpp.next_token(line, 0);
		else ISyntax.cpp.next_token(line, suffix[1].length, 'suffix');
	};

	// 文字リテラルの解析
	ISyntax.cpp.parse_char = function(line, offset = 0) {
		let ident_last = 0;
		// "の位置を取得することができなかったとき('～'の形式ではない)
		while ((ident_last = ISyntax.search_unescape(line[2], '\'', offset)) == -1) {
			// 一番最後の文字がエスケープされていないならば次の行も文字リテラルとなる
			const new_line = line[2].search(/(\\)+$/g);
			// 単に構文ミスであるときは，はじめの"以降全て文字リテラルとする
			if ((new_line == -1) || ((line[2].length - new_line) % 2 == 0)) {
				line[2] = '<span class="string">' + ISyntax.escape_html(line[2]) + '</span>';
				// 次の行の解析に移行できるようにする
				ISyntax.cpp.next_line(line);
				return;
			}
			// 正しく解析されたとき(\が奇数個並べばいい)
			// 最後の\以外を文字リテラルとする
			line[2] = '<span class="string">' + ISyntax.escape_html(line[2].substr(0, line[2].length - 1)) + '</span>' + '\\';
			// 次の行も文字リテラルとして解析
			if (!ISyntax.cpp.next_line(line)) return;
			offset = 0;
		}
		// '～'を文字列リテラルとして構成して接尾辞の解析
		ISyntax.cpp.add_analyzed_text(line, ident_last + 1, 'string');
		ISyntax.cpp.parse_suffix(line);
	};
	// 文字列リテラルの解析
	ISyntax.cpp.parse_string = function(line, offset = 0) {
		let ident_last = 0;
		// "の位置を取得することができなかったとき("～"の形式ではない)
		while ((ident_last = ISyntax.search_unescape(line[2], '\"', offset)) == -1) {
			// 一番最後の文字がエスケープされていないならば次の行も文字リテラルとなる
			const new_line = line[2].search(/(\\)+$/g);
			// 単に構文ミスであるときは，はじめの"以降全て文字リテラルとする
			if ((new_line == -1) || ((line[2].length - new_line) % 2 == 0)) {
				line[2] = '<span class="string">' + ISyntax.escape_html(line[2]) + '</span>';
				// 次の行の解析に移行できるようにする
				ISyntax.cpp.next_line(line);
				return;
			}
			// 正しく解析されたとき(\が奇数個並べばいい)
			// 最後の\以外を文字リテラルとする
			line[2] = '<span class="string">' + ISyntax.escape_html(line[2].substr(0, line[2].length - 1)) + '</span>' + '\\';
			// 次の行も文字リテラルとして解析
			if (!ISyntax.cpp.next_line(line)) return;
			offset = 0;
		}
		// "～"を文字列リテラルとして構成して接尾辞の解析
		ISyntax.cpp.add_analyzed_text(line, ident_last + 1, 'string');
		ISyntax.cpp.parse_suffix(line);
	};
	// 生文字列リテラルの解析("sequence(～)sequence")
	ISyntax.cpp.parse_raw_string = function(line, sequence, offset = 0) {
		// 探索対象の情報
		const search_str = ')' + sequence + '\"';
		let ident_last = 0;
		// )sequence"が見つからないときは行自体を文字列として処理
		while ((ident_last = line[2].indexOf(search_str, offset)) == -1) {
			line[2] = '<span class="string">' + ISyntax.escape_html(line[2]) + '</span>';
			// 次の行も生文字列リテラルとして解析
			if (!ISyntax.cpp.next_line(line)) return;
			offset = 0;
		}
		// "sequence(～)sequence"を生文字列リテラルとして構成して接尾辞の解析
		ISyntax.cpp.add_analyzed_text(line, ident_last + search_str.length, 'string');
		ISyntax.cpp.parse_suffix(line);
	};
	// 識別子の解析
	ISyntax.cpp.parse_ident = function(line) {
		const ident = line[2].match(/^((?:\w|\\u[\da-fA-F]{4}|\\U[\da-fA-F]{8})*)/);
		if (ident == null) return ISyntax.cpp.next_token(line, 0);
		// 各々の識別子の種類の判定して次の解析対象へと遷移
		let flag = false;
		for(var key in ISyntax.cpp.ident_table) {
			if (ISyntax.cpp.ident_table[key].includes(ident[1])) {
				flag = true;
				ISyntax.cpp.next_token(line, ident[1].length, key);
			}
		}
		// ハイライトさせる識別子が存在しなければそのままスキップ
		if (!flag) ISyntax.cpp.next_token(line, ident[1].length);
	};
	// 範囲コメントの解析
	ISyntax.cpp.parse_comment = function(line, offset = 0) {
		let ident_last = 0;
		// */が見つからないときは行自体を文字列として処理
		while ((ident_last = line[2].indexOf('*/', offset)) == -1) {
			line[2] = '<span class="comment">' + ISyntax.escape_html(line[2]) + '</span>';
			// 次の行もコメントとして解析
			if (!ISyntax.cpp.next_line(line)) return;
			offset = 0;
		}
		// search_str分の長さを考慮
		ident_last += 2;
		// /*～*/をコメントとして構成して次の解析対象へと遷移
		ISyntax.cpp.next_token(line, ident_last, 'comment');
	};
	// 2進数リテラルの解析(0[bB]～)
	ISyntax.cpp.parse_numeric2 = function(line) {
		// 次の数値の表現で用いない文字が出現するまで数値として取り扱う
		const integer_last = line[2].substr(2).search(/[^01\']/g);
		// 行の最後まで数値
		if (integer_last == -1) {
			ISyntax.cpp.next_token(line, line[2].length, 'numeric');
		}
		// それ以外は単に2進数整数リテラル
		else {
			ISyntax.cpp.add_analyzed_text(line, 2 + integer_last, 'numeric');
			ISyntax.cpp.parse_suffix(line);
		}
	};
	// 10進数リテラルの解析(8進数整数リテラルの場合も含める)正確ではないけど妥協
	ISyntax.cpp.parse_numeric10 = function(line) {
		// 次の数値の表現で用いない文字が出現するまで数値として取り扱う
		const integer_last = line[2].search(/[^\d\']/g);
		// 行の最後まで数値
		if (integer_last == -1)  {
			ISyntax.cpp.next_token(line, line[2].length, 'numeric');
		}
		// 整数部の次の文字が.ならば10進数浮動小数点リテラルとして処理
		else if (line[2][integer_last] == '.') {
			const temp = line[2].substr(integer_last + 1);
			const floating_point_literal = temp.match(/^([\d\']*(?:[eE][+\-]?[\d\']+)?)/);
			ISyntax.cpp.add_analyzed_text(line, integer_last + 1 + floating_point_literal[1].length, 'numeric');
			ISyntax.cpp.parse_suffix(line);
		}
		// 整数部分の次がeEならば10進数浮動小数点リテラルの指数部を処理
		else if ((line[2][integer_last] == 'e') || (line[2][integer_last] == 'E')) {
			const temp = line[2].substr(integer_last + 1);
			const floating_point_literal = temp.match(/^([+\-]?[\d\']+)/);
			// 字句エラー
			if (floating_point_literal == null) ISyntax.cpp.next_token(line, integer_last);
			else {
				ISyntax.cpp.add_analyzed_text(line, integer_last + 1 + floating_point_literal[1].length, 'numeric');
				ISyntax.cpp.parse_suffix(line);
			}
		}
		// それ以外は単に10進数整数リテラル
		else {
			ISyntax.cpp.add_analyzed_text(line, integer_last, 'numeric');
			ISyntax.cpp.parse_suffix(line);
		}
	};
	// 16進数リテラルの解析(0[xX]～)正確ではないけど妥協
	ISyntax.cpp.parse_numeric16 = function(line) {
		// 次の数値の表現で用いない文字が出現するまで数値として取り扱う
		const temp = line[2].substr(2);
		// 整数部分の最後の文字+1の位置
		const integer_last = temp.search(/[^\da-fA-F\']/g);
		// 行の最後まで数値
		if (integer_last == -1)  {
			ISyntax.cpp.next_token(line, line[2].length, 'numeric');
		}
		// 整数部の次の文字が.ならば16進数浮動小数点リテラルとして処理
		else if (temp[integer_last] == '.') {
			const temp2 = temp.substr(integer_last + 1);
			const floating_point_literal = temp2.match(/^([\da-fA-F\']*[pP][+\-]?[\d\']+)/);
			// 字句エラー
			if (floating_point_literal == null) ISyntax.cpp.next_token(line, 2 + integer_last);
			else {
				ISyntax.cpp.add_analyzed_text(line, 2 + integer_last + 1 + floating_point_literal[1].length, 'numeric');
				ISyntax.cpp.parse_suffix(line);
			}
		}
		// 整数部分の次がpPならば16進数浮動小数点リテラルの指数部を処理
		else if ((temp[integer_last] == 'p') || (temp[integer_last] == 'P')) {
			const temp2 = temp.substr(integer_last + 1);
			const floating_point_literal = temp2.match(/^([+\-]?[\d\']+)/);
			// 字句エラー
			if (floating_point_literal == null) ISyntax.cpp.next_token(line, 2 + integer_last);
			else {
				ISyntax.cpp.add_analyzed_text(line, 2 + integer_last + 1 + floating_point_literal[1].length, 'numeric');
				ISyntax.cpp.parse_suffix(line);
			}
		}
		// それ以外は単に16進数整数リテラル
		else {
			ISyntax.cpp.add_analyzed_text(line, 2 + integer_last, 'numeric');
			ISyntax.cpp.parse_suffix(line);
		}
	};

	// 通常のトークンの解析
	ISyntax.cpp.parse_token = function(line) {
		while (line[2].length != 0) {
			switch (line[2][0]) {
				case '\'':			// 文字リテラル
					ISyntax.cpp.parse_char(line, 1);
					break;
				case '\"':			// 文字列リテラル
					ISyntax.cpp.parse_string(line, 1);
					break;
				case '0':			// 数値リテラル
					// 次の文字が存在しないならば演算子として処理して次のトークンへと移行
					if (line[2].length == 1) ISyntax.cpp.next_token(line, 1, 'numeric');
					// 2進数リテラルの場合
					else if ((line[2][1] == 'b') || line[2][1] == 'B') ISyntax.cpp.parse_numeric2(line);
					// 16進数リテラルの場合
					else if ((line[2][1] == 'x') || line[2][1] == 'X') ISyntax.cpp.parse_numeric16(line);
					else ISyntax.cpp.parse_numeric10(line);
					break;
				case '1':			// 10進数数値リテラル
				case '2':
				case '3':
				case '4':
				case '5':
				case '6':
				case '7':
				case '8':
				case '9':
					ISyntax.cpp.parse_numeric10(line);
					break;
				case '.':			// 10進数浮動小数点リテラル
					// 次の文字が存在しないならば演算子として処理して次のトークンへと移行
					if (line[2].length == 1) ISyntax.cpp.next_token(line, 1, 'operator');
					// 次の文字が数値ならば10進数浮動小数点リテラルとして処理
					else if ((function is_numeric(charactor) {
							return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(charactor);
						})(line[2][1])) {
						const floating_point_literal = line[2].match(/^(\.[\d\']+(?:[eE][+\-]?[\d\']+)?)/);
						ISyntax.cpp.add_analyzed_text(line, floating_point_literal[1].length, 'numeric');
						ISyntax.cpp.parse_suffix(line);
					}
					// そうでなければ.を演算子として処理して次の解析をする
					else ISyntax.cpp.next_token(line, 1, 'operator');
					break;
				case 'u':			// 文字・文字列リテラルの接頭辞
				case 'U':
				case 'L':
					// 次の文字が存在しないならば識別子として処理
					if (line[2].length == 1) ISyntax.cpp.parse_ident(line);
					// 文字・文字列リテラルの場合
					else if (line[2][1] == '\"') {
						ISyntax.cpp.add_analyzed_text(line, 1, 'prefix');
						ISyntax.cpp.parse_string(line, 1);
					}
					else if (line[2][1] == '\'') {
						ISyntax.cpp.add_analyzed_text(line, 1, 'prefix');
						ISyntax.cpp.parse_char(line, 1);
					}
					// 生文字リテラルの可能性があるとき
					else if (line[2][1] == 'R') {
						const sequence = line[2].match(/^R\"(.*?)\(/);
						// マッチしたならば生文字列リテラルとして処理
						if (sequence != null) {
							ISyntax.cpp.add_analyzed_text(line, 2, 'prefix');
							// sequence[1]は生文字列のためのシーケンス
							ISyntax.cpp.parse_raw_string(line, sequence[1], sequence[1].length + 1);
						}
						// 識別子の処理をする
						else ISyntax.cpp.parse_ident(line);
					}
					else ISyntax.cpp.parse_ident(line);
					break;
				case 'R':			// 生文字列リテラル
					const sequence = line[2].match(/^R\"(.*?)\(/);
					// マッチしたならば生文字列リテラルとして処理
					if (sequence != null) {
						ISyntax.cpp.add_analyzed_text(line, 1, 'prefix');
						// sequence[1]は生文字列のためのシーケンス
						ISyntax.cpp.parse_raw_string(line, sequence[1], sequence[1].length + 1);
					}
					// 識別子の処理をする
					else ISyntax.cpp.parse_ident(line);
					break;
				case '/':			// コメント
					// 次の文字が存在しないならば演算子として処理して次のトークンへと移行
					if (line[2].length == 1) ISyntax.cpp.next_token(line, 1, 'operator');
					// 次の文字が/ならば行コメントとして処理
					else if (line[2][1] == '/') {
						// 行の一番最後に\が存在すれば次の行もコメントにする
						while (line[2][line[2].length - 1] == '\\') {
							line[2] = '<span class="comment">' + ISyntax.escape_html(line[2].substr(0, line[2].length - 1)) + '</span>' + '\\';
							// 次の行もコメントとして解析
							if (!ISyntax.cpp.next_line(line)) return;
						}
						line[2] = '<span class="comment">' + ISyntax.escape_html(line[2]) + '</span>';
						ISyntax.cpp.next_line_token(line);
					}
					// 次の文字が*ならば範囲コメントとして処理
					else if (line[2][1] == '*') ISyntax.cpp.parse_comment(line, 2);
					// そうでなければ/を演算子として処理して次の解析をする
					else ISyntax.cpp.next_token(line, 1, 'operator');
					break;
				case ':':			// 演算子として処理する記号
				case '+':
				case '-':
				case '*':
				case '[':
				case ']':
				case '=':
				case '!':
				case '|':
				case '%':
				case ',':
				case '&':
				case '<':
				case '>':
					ISyntax.cpp.next_token(line, 1, 'operator');
					break;
				default:			// 識別子等
					// 識別子であるかの判定
					if (line[2][0].search(/^[a-zA-Z_]|\\u[\da-fA-F]{4}|\\U[\da-fA-F]{8}/g) != -1) {
						ISyntax.cpp.parse_ident(line);
					}
					// 識別子でなければ次の解析をする
					else ISyntax.cpp.next_token(line, 1);
					break;
			}
		}
	};

	// 行頭の解析部
	ISyntax.cpp.parse_head_of_line = function(line) {
		do {
			// プリプロセッサ
			if (line[2][0] == '#') {
				// 行の一番最後に\が存在すれば次の行もプリプロセッサにする
				while (line[2][line[2].length - 1] == '\\') {
					line[2] = '<span class="preprocessor">' + ISyntax.escape_html(line[2].substr(0, line[2].length - 1)) + '</span>' + '\\';
					// 次の行もプリプロセッサとして解析
					if (!ISyntax.cpp.next_line(line)) return;
				}
				line[2] = '<span class="preprocessor">' + ISyntax.escape_html(line[2]) + '</span>';
				ISyntax.cpp.next_line_token(line);
			}
			else ISyntax.cpp.parse_token(line);
		} while(ISyntax.cpp.next_line(line));
	};

	ISyntax.cpp.init = function(line) {
		// line[2]を現在解析中の行，line[1][line[0]]を解析済みテキストとして扱う
		if (line[1].length > 0) {
			line[2] = line[1][0];
			line[1][0] = '';
			// 空白文字はスキップしてから解析(マクロのため)
			const temp = line[2].search(/\S/g);
			if (temp == -1) ISyntax.cpp.parse_head_of_line(line);
			else {
				if (temp != 0) ISyntax.cpp.add_analyzed_text(line, temp);
				ISyntax.cpp.parse_head_of_line(line);
			}
		}
	};
