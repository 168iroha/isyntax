/* ISyntax core 0.11.0 */

	var ISyntax = ISyntax || {};
	// 他のファイルを動的に読み込むためのこのディレクトリパス
	ISyntax.dir = (function() {
		if (document.currentScript && document.currentScript.hasAttribute('src')) {
			const temp = document.currentScript.getAttribute('src').split('/');
			temp.pop();
			return temp.join('/') + '/';
		}
		else {
			const temp = document.getElementsByTagName('script');
			const temp2 = temp[temp.length - 1];
			if (temp2.hasAttribute('src')) {
				const temp3 = temp2.getAttribute('src').split('/');
				temp3.pop();
				return temp3.join('/') + '/';
			}
		}
	})();

	// エスケープされていない文字cをstringから探索してインデックスを返す
	ISyntax.search_unescape = (function search_unescape(string, c, offset = 0) {
		const p = string.indexOf(c, offset);
		if (p <= 0) return p;
		if (string[p - 1] == '\\') return search_unescape(string, c, p + 1);
		return p;
	});
	// HTMLエスケープ文字への変換
	ISyntax.escape_html = function(string) {
		return string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	};
	// HTML文としての文字列の長さの取得
	ISyntax.length = function(string) {
		let temp = document.createElement('div');
		temp.innerHTML = string;
		return temp.innerText.length;
	};

	// 呼び出されたことのある言語に関するテーブル(テキストはデフォルトで与える)
	ISyntax.language_table = ['text'];
	ISyntax.text = ISyntax.text || {};
	ISyntax.text.language = 'Text';
	ISyntax.text.init = function(line) {
		for (let n = line[1].length; line[0] < n; ++line[0]) {
			line[1][line[0]] = ISyntax.escape_html(line[1][line[0]]);
		}
	};

	// パッケージのロード
	ISyntax.load_package = function(name) {
		// パッケージが静的に読み込まれているときは処理しない
		if (!(name in ISyntax)) {
			let req = new XMLHttpRequest();
			let result = false;
			req.open('GET', ISyntax.dir + name + '.js', false);
			//req.timeout = 2000;
			// clientの状態が変化するたびに呼ばれる関数
			req.onreadystatechange = () => {
				// 正常に読み込んだ
				if (req.readyState == 4 && req.status == 200) result = true;
				// ファイルが存在しない
				if (req.readyState == 4 && req.status == 404) result = false;
			};
			req.send();

			if (result) {
				Function(req.responseText)();
				//eval(req.responseText);
				ISyntax.language_table.push(name);
			}
		}
	};

	// 全体の初期化
	ISyntax.init = function(element = document) {
		// クラス名がcpp_codeである者に対して全て処理する
		element.querySelectorAll('pre[class*="isyntax_code-"]').forEach((node) => {
			// (現在解析中の行番号, 解析済みおよび解析対象の行ごとのテキスト, 現在解析対象のテキスト)
			let line = [0, node.textContent.split(/\r\n|\r|\n/g), ''];
			node.textContent = '';
			// 一番最後の行の改行を考慮
			if (line[1][line[1].length - 1] == '') line[1].pop();
			// タイトルやソースコードを挿入するためのdivを作成
			let div = document.createElement('div');
			div.classList.add('isyntax');
			// 解析結果のソースコード部
			let source_code = document.createElement('div');
			source_code.classList.add('source_code');
			let table = document.createElement('table');
			div.appendChild(source_code);
			source_code.appendChild(table);
			// 言語の指定
			let language_symbol = node.className.match(/isyntax_code\-(\w+)/);
			if (language_symbol != null) {
				// パッケージが読み込まれていなければJavaScriptを同期通信で読み込む
				if (!ISyntax.language_table.includes(language_symbol[1])) {
					ISyntax.load_package(language_symbol[1]);
				}
				// パッケージが読み込まれていないならばテキストファイルとして処理する
				if (!(language_symbol[1] in ISyntax)) {
					language_symbol[1] = 'text';
				}
				ISyntax[language_symbol[1]].init(line);
				div.insertAdjacentHTML('beforeend', '<span class="language">' + ISyntax[language_symbol[1]].language + '</span>');
			}
			// 結果の文字列を構成
			let result_text = '<tr>';
			// 行番号の指定があるとき
			if (node.classList.contains('line_numbers')) {
				let line_start = node.hasAttribute('data-start') ? parseInt(node.getAttribute('data-start'), 10) : 1;
				let temp1 = '', temp2 = '';
				line[1].forEach((l) => {
					temp1 += '<div class="line_numbers" data-line_number="' + line_start + '"></div>';
					temp2 += '<div>' + (ISyntax.length(l) == 0 ? '&nbsp;' : l) + '</div>';
					++line_start;
				});
				result_text += '<td>' + temp1 + '</td><td class="code">' + temp2 + '</td>';
			}
			else {
				let temp = '';
				line[1].forEach((l) => {
					temp += '<div>' + (ISyntax.length(l) == 0 ? '&nbsp;' : l) + '</div>';
				});
				result_text += '<td class="code">' + temp + '</td>';
			}
			result_text += '</tr>';
			// タイトルが存在すればタイトルを付ける
			if (node.hasAttribute('data-title')) {
				div.insertAdjacentHTML('beforeend', '<span class="title">' + node.getAttribute('data-title') + '</span>');
			}
			table.innerHTML = result_text;
			// 構成したDOMを追記して元のDOMを除去
			node.parentNode.insertBefore(div, node);
			node.parentNode.removeChild(node);
		});
	};

	window.addEventListener('DOMContentLoaded', function() {
		ISyntax.init();
	});
