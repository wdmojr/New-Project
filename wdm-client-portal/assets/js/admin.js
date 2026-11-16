/* WD Morgan Client Portal — admin */
jQuery(function ($) {
	// Status dropdowns save immediately.
	$(document).on('change', '.wdmcp-autosubmit', function () { this.form.submit(); });

	// Confirm destructive actions.
	$(document).on('click', '[data-confirm]', function (e) {
		if (!window.confirm($(this).data('confirm'))) e.preventDefault();
	});

	// Share-files drop field: highlight and show chosen file names.
	$('.wdmcp-dropfield').each(function () {
		var $f = $(this), $label = $f.find('span'), initial = $label.text();
		$f.on('dragenter dragover', function () { $f.addClass('is-over'); })
			.on('dragleave drop', function () { $f.removeClass('is-over'); });
		$f.find('input').on('change', function () {
			var n = this.files.length;
			$label.text(n ? Array.prototype.map.call(this.files, function (x) { return x.name; }).join(', ') : initial);
		});
	});

	// Color pickers.
	if ($.fn.wpColorPicker) $('.wdmcp-color').wpColorPicker();

	// Logo picker.
	var frame;
	$('[data-wdmcp-pick-logo]').on('click', function (e) {
		e.preventDefault();
		if (!window.wp || !wp.media) return;
		if (!frame) {
			frame = wp.media({ title: 'Choose logo', library: { type: 'image' }, multiple: false });
			frame.on('select', function () {
				var a = frame.state().get('selection').first().toJSON();
				$('[data-wdmcp-logo]').val(a.url);
				$('[data-wdmcp-logo-preview]').attr('src', a.url).prop('hidden', false);
				$('[data-wdmcp-clear-logo]').prop('hidden', false);
			});
		}
		frame.open();
	});
	$('[data-wdmcp-clear-logo]').on('click', function (e) {
		e.preventDefault();
		$('[data-wdmcp-logo]').val('');
		$('[data-wdmcp-logo-preview]').prop('hidden', true);
		$(this).prop('hidden', true);
	});
});
