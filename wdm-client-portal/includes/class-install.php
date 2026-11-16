<?php
/**
 * Activation, database tables, roles and protected storage.
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_Install {

	const DB_VERSION = '1.0';

	public static function activate() {
		self::create_tables();
		self::add_roles();
		self::protect_storage();
		self::create_portal_page();
		update_option( 'wdmcp_db_version', self::DB_VERSION );
	}

	public static function maybe_upgrade() {
		if ( get_option( 'wdmcp_db_version' ) !== self::DB_VERSION ) {
			self::activate();
		}
	}

	public static function create_tables() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}wdmcp_files (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			client_id bigint(20) unsigned NOT NULL,
			uploaded_by bigint(20) unsigned NOT NULL,
			direction varchar(10) NOT NULL DEFAULT 'in',
			request_id bigint(20) unsigned NOT NULL DEFAULT 0,
			original_name varchar(255) NOT NULL,
			stored_name varchar(80) NOT NULL,
			mime varchar(120) NOT NULL DEFAULT '',
			size bigint(20) unsigned NOT NULL DEFAULT 0,
			note text NULL,
			status varchar(20) NOT NULL DEFAULT 'received',
			downloaded_at datetime NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY client_dir (client_id,direction),
			KEY status (status)
		) $charset;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}wdmcp_requests (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			client_id bigint(20) unsigned NOT NULL,
			created_by bigint(20) unsigned NOT NULL,
			title varchar(200) NOT NULL,
			details text NULL,
			due_date date NULL,
			status varchar(20) NOT NULL DEFAULT 'open',
			created_at datetime NOT NULL,
			completed_at datetime NULL,
			PRIMARY KEY  (id),
			KEY client_status (client_id,status)
		) $charset;"
		);

		dbDelta(
			"CREATE TABLE {$wpdb->prefix}wdmcp_activity (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			client_id bigint(20) unsigned NOT NULL,
			actor_id bigint(20) unsigned NOT NULL DEFAULT 0,
			type varchar(40) NOT NULL,
			message varchar(500) NOT NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY client_time (client_id,created_at)
		) $charset;"
		);
	}

	public static function add_roles() {
		if ( ! get_role( 'wdm_client' ) ) {
			add_role(
				'wdm_client',
				__( 'Portal Client', 'wdm-client-portal' ),
				array(
					'read'                => true,
					'wdmcp_portal_access' => true,
				)
			);
		}
		$admin = get_role( 'administrator' );
		if ( $admin ) {
			$admin->add_cap( 'wdmcp_manage' );
			$admin->add_cap( 'wdmcp_portal_access' );
		}
	}

	public static function storage_dir() {
		$up = wp_upload_dir( null, false );
		return trailingslashit( $up['basedir'] ) . 'wdm-client-portal';
	}

	/** Files live in uploads/wdm-client-portal with random names and no public access. */
	public static function protect_storage() {
		$dir = self::storage_dir();
		if ( ! wp_mkdir_p( $dir ) ) {
			return;
		}
		$files = array(
			'.htaccess'  => "# WD Morgan Client Portal: block direct access.\n<IfModule mod_authz_core.c>\n\tRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n\tDeny from all\n</IfModule>\n",
			'index.php'  => "<?php\n// Silence is golden.\n",
			'web.config' => "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<configuration><system.webServer><authorization><deny users=\"*\" /></authorization></system.webServer></configuration>\n",
		);
		foreach ( $files as $name => $contents ) {
			$path = $dir . '/' . $name;
			if ( ! file_exists( $path ) ) {
				file_put_contents( $path, $contents ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			}
		}
	}

	public static function create_portal_page() {
		$settings = WDMCP_Helpers::settings();
		$page_id  = (int) $settings['portal_page_id'];
		if ( $page_id && get_post_status( $page_id ) ) {
			return;
		}
		$page_id = wp_insert_post(
			array(
				'post_title'   => __( 'Client Portal', 'wdm-client-portal' ),
				'post_name'    => 'client-portal',
				'post_content' => '<!-- wp:shortcode -->[wdm_client_portal]<!-- /wp:shortcode -->',
				'post_status'  => 'publish',
				'post_type'    => 'page',
			)
		);
		if ( $page_id && ! is_wp_error( $page_id ) ) {
			$saved                   = get_option( WDMCP_Helpers::OPTION, array() );
			$saved                   = is_array( $saved ) ? $saved : array();
			$saved['portal_page_id'] = $page_id;
			update_option( WDMCP_Helpers::OPTION, $saved );
		}
	}

	/** Remove a client's files and records when their user account is deleted. */
	public static function purge_client( $user_id ) {
		global $wpdb;
		$ids = $wpdb->get_col( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}wdmcp_files WHERE client_id = %d", $user_id ) );
		foreach ( $ids as $id ) {
			WDMCP_Files::delete( (int) $id );
		}
		$wpdb->delete( $wpdb->prefix . 'wdmcp_requests', array( 'client_id' => $user_id ) );
		$wpdb->delete( $wpdb->prefix . 'wdmcp_activity', array( 'client_id' => $user_id ) );
		$dir = self::storage_dir() . '/' . (int) $user_id;
		if ( is_dir( $dir ) ) {
			@rmdir( $dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}
	}
}
