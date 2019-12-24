import { List } from "./list.js";
import { Navi } from "./navi.js";
import { Pager } from "./pager.js";
import { Tagger } from "./tagger.js";
import { Controller } from "./controller.js";
import { BookmarkList } from "./bookmark.js";

document.addEventListener("DOMContentLoaded", () => {

	let list_elem = document.getElementById("list");
	let list = new List(list_elem);

	let header_elem = document.getElementById("header");
	let menu_elem = document.getElementById("menu");
	let navi = new Navi(header_elem, menu_elem);

	let pager_elem = document.getElementById("pager");
	let pager = new Pager(pager_elem, 3);

	let bookmark_list = new BookmarkList(window.localStorage);
	let tagger_elems = document.querySelectorAll(".tagger");
	let dialog_box_elem = document.getElementById("tagger-dialog-box");
	let tagger = new Tagger(tagger_elems, dialog_box_elem, bookmark_list);

	let ctrler = new Controller(list, navi, pager, tagger, bookmark_list);
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

	window.addEventListener("keydown", (ev) => {
		if(ctrler.in_pager) {
			switch(ev.code) {
				case "ArrowRight":
					ev.preventDefault();
					ctrler.move_to_next_page();
					break;
				case "ArrowLeft":
					ev.preventDefault();
					ctrler.move_to_prev_page();
					break;
				case "Escape":
					ev.preventDefault();
					ctrler.switch_to_list();
					break;
				case "Space":
					ev.preventDefault();
					ctrler.toggle_toolbox();
					break;
			}
		} else {
			switch(ev.code) {
				case "Escape":
					ev.preventDefault();
					if(ctrler.menu_expanded) {
						ctrler.close_menu();
					} else {
						ctrler.move_to_parent();
					}
			}
		}
	})

	ctrler.rewrite_with(document.location);
});
