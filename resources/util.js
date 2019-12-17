async function fetch_json(url, controller = undefined) {
	let opt = {};
	if(controller !== undefined) {
		opt.signal = controller.signal;
	}
	let resp = await fetch(url, opt);
	if(!resp.ok) {
		throw resp.statusText;
	}
	return resp.json();
}

function get_friendly_size_text(size) {
	let units = ["", "K", "M", "G", "T"];
	for(let i = 0, base = 1; i < units.length; i += 1, base = base * 1000) {
		if(size >= 1000 * base && i + 1 < units.length) {
			continue;
		}
		return `${(size / base).toFixed(1)} ${units[i]}B`;
	}
}

function splitN(text, separator, limit) {
	let it = 0;
	let comps = [];
	while(it < text.length && comps.length + 1 < limit) {
		let n = text.indexOf(separator, it);
		if(n === -1) {
			break;
		}
		comps.push(text.slice(it, n));
		it = n + 1;
	}
	if((it < text.length || text[text.length - 1] === separator) && comps.length < limit) {
		comps.push(text.slice(it));
	}
	return comps;
}

function assert_eq(expected, actual) {
	let x = "[" + expected.map((v) => `"${v}"`).join(",") + "]";
	let y = "[" + actual.map((v) => `"${v}"`).join(",") + "]";
	if(x !== y) {
		throw `expected: ${x}, actual: ${y}`;
	}
}

function test_splitN(text, n, expected) {
	let result = splitN(text, ":", n);
	assert_eq(expected, result);
}

test_splitN("aaa:bbb:ccc:ddd", 1, ["aaa:bbb:ccc:ddd"]);
test_splitN("aaa:bbb:ccc:ddd", 2, ["aaa", "bbb:ccc:ddd"]);
test_splitN("aaa:bbb:ccc:ddd", 3, ["aaa", "bbb", "ccc:ddd"]);
test_splitN("aaa:bbb:ccc:ddd", 4, ["aaa", "bbb", "ccc", "ddd"]);
test_splitN("aaa:bbb:ccc:", 3, ["aaa", "bbb", "ccc:"]);
test_splitN("aaa:bbb:ccc:", 4, ["aaa", "bbb", "ccc", ""]);
test_splitN(":::", 5, ["", "", "", ""]);
test_splitN(":::a", 5, ["", "", "", "a"]);
test_splitN("a:::", 5, ["a", "", "", ""]);

export { fetch_json, get_friendly_size_text, splitN }
