<?php
/**
 * Plugin Name:       WD Morgan Client Portal
 * Plugin URI:        https://wdmorgan.com
 * Description:       A simple, secure client portal. Clients sign in, drag and drop files to your team, see files you've shared, and track what you need from them.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            WD Morgan Solutions
 * Author URI:        https://wdmorgan.com
 * License:           GPL-2.0-or-later
 * Text Domain:       wdm-client-portal
 */

defined( 'ABSPATH' ) || exit;

define( 'WDMCP_VERSION', '1.0.0' );
define( 'WDMCP_FILE', __FILE__ );
define( 'WDMCP_DIR', plugin_dir_path( __FILE__ ) );
define( 'WDMCP_URL', plugin_dir_url( __FILE__ ) );

require_once WDMCP_DIR . 'includes/class-helpers.php';
require_once WDMCP_DIR . 'includes/class-install.php';
require_once WDMCP_DIR . 'includes/class-files.php';
require_once WDMCP_DIR . 'includes/class-requests.php';
require_once WDMCP_DIR . 'includes/class-activity.php';
require_once WDMCP_DIR . 'includes/class-notify.php';
require_once WDMCP_DIR . 'includes/class-view.php';
require_once WDMCP_DIR . 'includes/class-frontend.php';
require_once WDMCP_DIR . 'includes/class-admin.php';

register_activation_hook( __FILE__, array( 'WDMCP_Install', 'activate' ) );

add_action(
	'plugins_loaded',
	function () {
		WDMCP_Install::maybe_upgrade();
		WDMCP_Frontend::init();
		if ( is_admin() ) {
			WDMCP_Admin::init();
		}
		// Downloads run through admin-post.php, which is_admin() covers, but keep it explicit.
		add_action( 'admin_post_wdmcp_download', array( 'WDMCP_Files', 'handle_download' ) );
		// Clean up when a client account is deleted.
		add_action( 'delete_user', array( 'WDMCP_Install', 'purge_client' ) );
	}
);
