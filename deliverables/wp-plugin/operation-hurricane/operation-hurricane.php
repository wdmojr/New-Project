<?php
/**
 * Plugin Name: Operation Hurricane (Grey Bull Rescue)
 * Description: Serves the Operation Hurricane game at /operation-hurricane/ to logged-in users only. Embed it in a page with [operation_hurricane].
 * Version: 1.0.0
 * Author: WD Morgan
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const GBR_OH_SLUG = 'operation-hurricane';

function gbr_oh_rewrite() {
	add_rewrite_rule( '^' . GBR_OH_SLUG . '/?$', 'index.php?gbr_oh_game=1', 'top' );
}
add_action( 'init', 'gbr_oh_rewrite' );

add_filter( 'query_vars', function ( $vars ) {
	$vars[] = 'gbr_oh_game';
	return $vars;
} );

function gbr_oh_url() {
	return get_option( 'permalink_structure' ) ? home_url( '/' . GBR_OH_SLUG . '/' ) : add_query_arg( 'gbr_oh_game', '1', home_url( '/' ) );
}

// Serve the game, or send visitors to the WordPress login and back.
add_action( 'template_redirect', function () {
	if ( ! get_query_var( 'gbr_oh_game' ) ) {
		return;
	}
	if ( ! is_user_logged_in() ) {
		wp_safe_redirect( wp_login_url( gbr_oh_url() ) );
		exit;
	}
	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	header( 'X-Robots-Tag: noindex, nofollow' );
	readfile( __DIR__ . '/game/game.dat' );
	exit;
} );

// [operation_hurricane] shows the game in a page; logged-out visitors get a login button.
add_shortcode( 'operation_hurricane', function () {
	if ( ! is_user_logged_in() ) {
		return '<p style="text-align:center"><a class="wp-element-button" href="' . esc_url( wp_login_url( get_permalink() ) ) . '">Log in to play Operation Hurricane</a></p>';
	}
	return '<div style="position:relative;width:100%;aspect-ratio:16/9;background:#070c13">'
		. '<iframe src="' . esc_url( gbr_oh_url() ) . '" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; fullscreen" allowfullscreen title="Operation Hurricane"></iframe></div>'
		. '<p style="text-align:center"><a href="' . esc_url( gbr_oh_url() ) . '" target="_blank" rel="noopener">Open full screen</a></p>';
} );

register_activation_hook( __FILE__, function () {
	gbr_oh_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
