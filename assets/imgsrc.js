function replace_img_src_if_needed(elem) {
	let src = new URL(elem.dataset.src, document.location);
	let prev_src = new URL(elem.src || "", document.location);
	if(src.href != prev_src.href) {
		elem.src = "";
		elem.src = src;
	}
}

function reset_img_src_if_incomplete(elem) {
	if(!elem.complete) {
		elem.src = "";
	}
}

export { replace_img_src_if_needed, reset_img_src_if_incomplete }
