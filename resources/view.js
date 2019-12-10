import { List } from "./list.js";
import { Navi } from "./navi.js";
import { Controller } from "./controller.js";

document.addEventListener("DOMContentLoaded", () => {

	let list_elem = document.getElementById("list");
	let list = new List(list_elem);

	let header_elem = document.getElementById("header");
	let menu_elem = document.getElementById("menu");
	let navi = new Navi(header_elem, menu_elem);

	let ctrler = new Controller(list, navi);
	ctrler.on_push_state = (url, extra, replacing) => {
		if(replacing === true) {
			window.history.replaceState(extra, "", url);
		} else {
			window.history.pushState(extra, "", url);
		}
	};
	window.addEventListener("popstate", (ev) => {
		ctrler.rewrite_with(document.location);
	});

	ctrler.rewrite_with(document.location);
});
