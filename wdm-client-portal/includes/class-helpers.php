<?php
/**
 * Shared helpers: settings, permissions, formatting.
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_Helpers {

	const OPTION = 'wdmcp_settings';

	/** Default extensions clients may upload. Files are never executed or shown inline, only downloaded. */
	const DEFAULT_TYPES = 'pdf, doc, docx, xls, xlsx, csv, ppt, pptx, txt, rtf, odt, ods, pages, numbers, key, jpg, jpeg, png, gif, webp, heic, tif, tiff, psd, ai, eps, indd, sketch, fig, zip, rar, 7z, mp4, mov, m4v, mp3, wav, m4a';

	/** Never accept these, even if an admin adds them to the list. */
	const BLOCKED_TYPES = array( 'php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'phar', 'pht', 'phps', 'cgi', 'pl', 'py', 'sh', 'bash', 'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'js', 'mjs', 'jsp', 'asp', 'aspx', 'html', 'htm', 'xhtml', 'shtml', 'svg', 'svgz', 'xml', 'htaccess', 'htpasswd', 'ini', 'dll', 'jar', 'vbs', 'ps1', 'hta' );

	public static function defaults() {
		return array(
			'portal_page_id'      => 0,
			'company_name'        => 'WD Morgan Solutions',
			'logo_url'            => '',
			'brand_color'         => '#213c7a',
			'accent_color'        => '#00c375',
			'full_screen'         => 1,
			'announcement'        => '',
			'notify_emails'       => get_option( 'admin_email' ),
			'max_file_mb'         => 256,
			'allowed_types'       => self::DEFAULT_TYPES,
			'default_manager'     => 0,
			'contact_email'       => get_option( 'admin_email' ),
			'contact_phone'       => '',
			'booking_url'         => '',
			'payment_url'         => '',
			'delete_on_uninstall' => 0,
		);
	}

	public static function settings() {
		$saved = get_option( self::OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	public static function get( $key ) {
		$s = self::settings();
		return isset( $s[ $key ] ) ? $s[ $key ] : null;
	}

	/* ---------- Permissions ---------- */

	public static function is_client( $user_id = 0 ) {
		$user_id = $user_id ? $user_id : get_current_user_id();
		return $user_id && user_can( $user_id, 'wdmcp_portal_access' ) && ! user_can( $user_id, 'wdmcp_manage' );
	}

	public static function can_manage( $user_id = 0 ) {
		$user_id = $user_id ? $user_id : get_current_user_id();
		return $user_id && user_can( $user_id, 'wdmcp_manage' );
	}

	/* ---------- URLs ---------- */

	public static function portal_url( $args = array() ) {
		$page = (int) self::get( 'portal_page_id' );
		$url  = $page ? get_permalink( $page ) : home_url( '/' );
		return $args ? add_query_arg( $args, $url ) : $url;
	}

	public static function client_admin_url( $client_id, $args = array() ) {
		return add_query_arg(
			array_merge( array( 'page' => 'wdmcp', 'client' => (int) $client_id ), $args ),
			admin_url( 'admin.php' )
		);
	}

	/* ---------- Files ---------- */

	public static function allowed_extensions() {
		$list = array_filter( array_map( 'trim', explode( ',', strtolower( (string) self::get( 'allowed_types' ) ) ) ) );
		$list = array_map(
			function ( $e ) {
				return ltrim( preg_replace( '/[^a-z0-9]/', '', $e ), '.' );
			},
			$list
		);
		return array_values( array_unique( array_diff( array_filter( $list ), self::BLOCKED_TYPES ) ) );
	}

	/** Effective max upload size in bytes: the lower of our setting and what PHP allows. */
	public static function max_upload_bytes() {
		$ours = max( 1, (int) self::get( 'max_file_mb' ) ) * MB_IN_BYTES;
		$php  = (int) wp_max_upload_size();
		return $php > 0 ? min( $ours, $php ) : $ours;
	}

	public static function file_kind( $name ) {
		$ext  = strtolower( pathinfo( $name, PATHINFO_EXTENSION ) );
		$map  = array(
			'pdf'     => array( 'pdf' ),
			'image'   => array( 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'tif', 'tiff', 'bmp' ),
			'design'  => array( 'psd', 'ai', 'eps', 'indd', 'sketch', 'fig', 'xd' ),
			'doc'     => array( 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md' ),
			'sheet'   => array( 'xls', 'xlsx', 'csv', 'ods', 'numbers' ),
			'slides'  => array( 'ppt', 'pptx', 'key', 'odp' ),
			'archive' => array( 'zip', 'rar', '7z', 'gz', 'tar' ),
			'video'   => array( 'mp4', 'mov', 'm4v', 'avi', 'webm' ),
			'audio'   => array( 'mp3', 'wav', 'm4a', 'aac', 'ogg' ),
		);
		foreach ( $map as $kind => $exts ) {
			if ( in_array( $ext, $exts, true ) ) {
				return $kind;
			}
		}
		return 'other';
	}

	/* ---------- Labels & formatting ---------- */

	public static function file_statuses() {
		return array(
			'received'  => __( 'Received', 'wdm-client-portal' ),
			'in_review' => __( 'In review', 'wdm-client-portal' ),
			'done'      => __( 'Done', 'wdm-client-portal' ),
		);
	}

	public static function status_label( $status ) {
		$all = self::file_statuses();
		return isset( $all[ $status ] ) ? $all[ $status ] : ucfirst( $status );
	}

	public static function now() {
		return current_time( 'mysql', true );
	}

	/** "3 hours ago" for recent things, a date for older ones. Input is a GMT MySQL datetime. */
	public static function when( $gmt ) {
		if ( ! $gmt ) {
			return '';
		}
		$ts   = strtotime( $gmt . ' UTC' );
		$diff = time() - $ts;
		if ( $diff < 60 ) {
			return __( 'just now', 'wdm-client-portal' );
		}
		if ( $diff < 7 * DAY_IN_SECONDS ) {
			/* translators: %s: human time difference */
			return sprintf( __( '%s ago', 'wdm-client-portal' ), human_time_diff( $ts ) );
		}
		return wp_date( get_option( 'date_format' ), $ts );
	}

	public static function full_date( $gmt ) {
		return $gmt ? wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $gmt . ' UTC' ) ) : '';
	}

	public static function first_name( $user ) {
		$user = is_object( $user ) ? $user : get_userdata( $user );
		if ( ! $user ) {
			return '';
		}
		return $user->first_name ? $user->first_name : $user->display_name;
	}

	public static function company( $user_id ) {
		return (string) get_user_meta( $user_id, 'wdmcp_company', true );
	}

	/** The staff member shown on a client's "Your contact" card. */
	public static function manager_for( $client_id ) {
		$id = (int) get_user_meta( $client_id, 'wdmcp_manager_id', true );
		if ( ! $id ) {
			$id = (int) self::get( 'default_manager' );
		}
		$user = $id ? get_userdata( $id ) : false;
		return $user ? $user : null;
	}

	public static function staff_users() {
		return get_users(
			array(
				'capability' => 'wdmcp_manage',
				'orderby'    => 'display_name',
				'fields'     => array( 'ID', 'display_name', 'user_email' ),
			)
		);
	}

	public static function sanitize_hex( $color, $fallback ) {
		$c = sanitize_hex_color( $color );
		return $c ? $c : $fallback;
	}
}
