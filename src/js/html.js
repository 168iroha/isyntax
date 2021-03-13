/* ISyntax HTML 0.5.0 */

	ISyntax.html = ISyntax.html || {};
	ISyntax.html.language = 'HTML';

	// 解析済みテキストへの追記(size:新たな解析済みテキストのサイズ)
	ISyntax.html.add_analyzed_text = function(line, size, style = '') {
		if (style == '') line[1][line[0]] += ISyntax.escape_html(line[2].substr(0, size));
		else line[1][line[0]] += '<span class="' + style + '">' + ISyntax.escape_html(line[2].substr(0, size)) + '</span>';
		line[2] = line[2].substr(size);
	};
	// 次の行に走査対象を移す(戻り値がfalseであれば終端を示す)
	ISyntax.html.next_line = function(line) {
		// 解析対象のテキストが残っていたら追記
		if ((line[0] >= 0) && (line[0] < line[1].length)) {
			line[1][line[0]] += line[2];
			line[2] = '';
			++line[0];
		}
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
	ISyntax.html.next_line_token = function(line) {
		line[1][line[0]] += line[2];
		line[2] = '';
	};
	// 現在の行の次のトークンの始端へと走査対象を移す(size:前のトークンのサイズ)
	ISyntax.html.next_token = function(line, size, style = '') {
		if (size > 0) ISyntax.html.add_analyzed_text(line, size, style);
		// 行からトークンを取得しようとすることが可能であるならば取得しようとする
		if (line[2].length > 0) {
			const temp = line[2].search(/\S/g);
			// 次のトークンが取得できなかった現在の行に全て追記
			if (temp == -1) ISyntax.html.next_line_token(line)
			else {
				// 解析済みテキストに追記
				if (temp != 0) ISyntax.html.add_analyzed_text(line, temp);
			}
		}
	};

	// 文字列リテラルの解析
	ISyntax.html.parse_string = function(line, offset = 0) {
		let ident_last = 0;
		// "の位置を取得することができなかったとき("～"の形式ではない)
		while ((ident_last = ISyntax.search_unescape(line[2], '\"', offset)) == -1) {
			line[2] = '<span class="string">' + ISyntax.escape_html(line[2].substr(0, line[2].length)) + '</span>';
			// 次の行も文字リテラルとして解析
			if (!ISyntax.html.next_line(line)) return;
			offset = 0;
		}
		// "～"を文字列リテラルとして構成して次の解析
		line[3] = 'string';
		ISyntax.html.next_token(line, ident_last + 1, 'string');
	};
	ISyntax.html.parse_char = function(line, offset = 0) {
		let ident_last = 0;
		// 'の位置を取得することができなかったとき('～'の形式ではない)
		while ((ident_last = ISyntax.search_unescape(line[2], '\'', offset)) == -1) {
			line[2] = '<span class="string">' + ISyntax.escape_html(line[2].substr(0, line[2].length)) + '</span>';
			// 次の行も文字リテラルとして解析
			if (!ISyntax.html.next_line(line)) return;
			offset = 0;
		}
		// '～'を文字列リテラルとして構成して次の解析
		line[3] = 'string';
		ISyntax.html.next_token(line, ident_last + 1, 'string');
	};

	// 通常のトークンの解析
	ISyntax.html.parse_token = function(line) {
		while (line[2].length != 0) {
			switch (line[2][0]) {
				case '\'':			// 文字リテラル
					// 等号の解析をしていなければスキップ
					if ((line[3] != 'equal') && (line[3] != '')) {
						ISyntax.html.next_token(line, 1, 'error');
					}
					else if (line[3] == 'equal') ISyntax.html.parse_char(line, 1);
					break;
				case '\"':			// 文字列リテラル
					if ((line[3] != 'equal') && (line[3] != '')) {
						ISyntax.html.next_token(line, 1, 'error');
					}
					else if (line[3] == 'equal') ISyntax.html.parse_string(line, 1);
					break;
				case '<':
					let ident_last = 0;
					// 新しくタグを生成できないとき
					if (line[3] != '') {
						ISyntax.html.next_token(line, 1, 'error');
					}
					// 次の文字が空白であるときは無視する
					else if (line[2].substr(1, 1).match(/\s/g)) {
						ISyntax.html.next_token(line, 1);
					}
					// 次の文字列が!--であるときはコメント
					else if ((ident_last = line[2].indexOf('!--', 1)) == 1) {
						let offset = 4;
						// -->が見つからないときは行自体をコメントとして処理
						while ((ident_last = line[2].indexOf('-->', offset)) == -1) {
							line[2] = '<span class="comment">' + ISyntax.escape_html(line[2]) + '</span>';
							// 次の行もコメントとして解析
							if (!ISyntax.html.next_line(line)) return;
							offset = 0;
						}
						// search_str分の長さを考慮
						ident_last += 3;
						// <!--～-->をコメントとして構成して次の解析対象へと遷移
						line[3] = '';
						ISyntax.html.next_token(line, ident_last, 'comment');
					}
					// 次の文字列が?phpであるときはphpのソース
					else if ((ident_last = line[2].indexOf('?php', 1)) == 1) {
						let offset = 5;
						// ?>が見つからないときは行自体をphpのソースとして処理
						while ((ident_last = line[2].indexOf('?>', offset)) == -1) {
							line[2] = '<span class="error">' + ISyntax.escape_html(line[2]) + '</span>';
							// 次の行もphpとして解析
							if (!ISyntax.html.next_line(line)) return;
							offset = 0;
						}
						// search_str分の長さを考慮
						ident_last += 2;
						// <?php～?>をphpとして構成して次の解析対象へと遷移
						line[3] = '';
						ISyntax.html.next_token(line, ident_last, 'error');
					}
					else {
						line[3] = 'tag';
						ISyntax.html.next_token(line, 1, 'tag_ends');
					}
					break;
				case '>':
					// タグの解析をしていないとき
					if (line[3] == '') {
						ISyntax.html.next_token(line, 1);
					}
					else {
						line[3] = '';
						ISyntax.html.next_token(line, 1, 'tag_ends');
					}
					break;
				case '=':
					// 属性の解析をしていないときはスキップ
					if ((line[3] != 'type') && (line[3] != '')) {
						ISyntax.html.next_token(line, 1, 'error');
					}
					else if (line[3] == 'type') {
						line[3] = 'equal';
						ISyntax.html.next_token(line, 1);			// 特に修飾しない
					}
					break;
				default:
					if (line[3] == '') {
						let temp = line[2].indexOf('<');
						if (temp == -1) ISyntax.html.next_line(line);
						else ISyntax.html.next_token(line, temp);
					}
					else {
						// 次の空白文字もしくは行末やキーワードまで探索
						let temp = line[2].search(/\s|\=|\>|\</g);
						if (temp == -1) temp = line[2].length;
						// 属性に応じて処理を分岐
						switch (line[3]) {
							case 'tag':
							case 'string':
							case 'type':
								line[3] = 'type';
								ISyntax.html.next_token(line, temp, 'type');
								break;
							case 'equal':
								line[3] = 'string';
								ISyntax.html.next_token(line, temp, 'string');
								break;
							default:
								ISyntax.html.next_token(line, temp);
								break;
						}
					}
					break;
			}
		}
	};

	// 行頭の解析部
	ISyntax.html.parse_head_of_line = function(line) {
		do {
			ISyntax.html.parse_token(line);
		} while(ISyntax.html.next_line(line));
	};

	ISyntax.html.init = function(line) {
		// line[2]を現在解析中の行，line[1][line[0]]を解析済みテキストとして扱う
		if (line[1].length > 0) {
			line[2] = line[1][0];
			line[1][0] = '';
		}
		// 前回解析したトークンの記憶
		// '':タグが来るまで特になし
		// 'tag':タグの解析に入った
		// 'type':タグ中の属性
		// 'string':'type'に対応する文字列
		// `equal`:等号の解析
		line.push('');
		// 現在解析中の言語のパッケージ名
		line.push('html');
		ISyntax.html.parse_head_of_line(line);
	};
