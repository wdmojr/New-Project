<?php
/**
 * Front-end portal: shortcode, sign-in, AJAX endpoints, and keeping clients out of wp-admin.
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_Frontend {

	private static $login_error = '';

	public static function init() {
		add_shortcode( 'wdm_client_portal', array( __CLASS__, 'shortcode' ) );
		add_action( 'init', array( __CLASS__, 'handle_login' ) );
		add_filter( 'template_include', array( __CLASS__, 'canvas_template' ), 99 );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'strip_theme_styles' ), 9999 );

		// Clients live in the portal, not wp-admin.
		add_filter( 'login_redirect', array( __CLASS__, 'login_redirect' ), 10, 3 );
		add_action( 'admin_init', array( __CLASS__, 'block_admin' ) );
		add_filter( 'show_admin_bar', array( __CLASS__, 'admin_bar' ) );
		add_action( 'wp_login', array( __CLASS__, 'record_login' ), 10, 2 );

		// Brand the WordPress login / reset-password screens too.
		add_action( 'login_enqueue_scripts', array( __CLASS__, 'brand_login_screen' ) );
		add_filter( 'login_headerurl', array( __CLASS__, 'portal_or_home' ) );
		add_filter( 'login_headertext', array( __CLASS__, 'company_name' ) );

		foreach ( array( 'upload', 'upload_done', 'delete', 'seen', 'account' ) as $a ) {
			add_action( 'wp_ajax_wdmcp_' . $a, array( __CLASS__, 'ajax_' . $a ) );
		}
	}

	public static function is_portal_page() {
		$id = (int) WDMCP_Helpers::get( 'portal_page_id' );
		return $id && is_page( $id );
	}

	/* ---------- Rendering ---------- */

	public static function shortcode() {
		self::enqueue();
		ob_start();
		if ( ! is_user_logged_in() ) {
			$error = self::$login_error;
			include WDMCP_DIR . 'templates/login.php';
		} elseif ( WDMCP_Helpers::is_client() ) {
			$user = wp_get_current_user();
			include WDMCP_DIR . 'templates/dashboard.php';
		} else {
			include WDMCP_DIR . 'templates/staff-notice.php';
		}
		return ob_get_clean();
	}

	/** Full-screen mode: render the portal on a clean canvas instead of inside the theme. */
	public static function canvas_template( $template ) {
		if ( self::is_portal_page() && WDMCP_Helpers::get( 'full_screen' ) ) {
			return WDMCP_DIR . 'templates/canvas.php';
		}
		return $template;
	}

	public static function strip_theme_styles() {
		if ( ! self::is_portal_page() || ! WDMCP_Helpers::get( 'full_screen' ) ) {
			return;
		}
		global $wp_styles;
		foreach ( (array) $wp_styles->queue as $handle ) {
			$src = isset( $wp_styles->registered[ $handle ] ) ? (string) $wp_styles->registered[ $handle ]->src : '';
			if ( false !== strpos( $src, '/themes/' ) ) {
				wp_dequeue_style( $handle );
			}
		}
		wp_dequeue_style( 'global-styles' );
		wp_dequeue_style( 'wp-block-library-theme' );
	}

	public static function assets() {
		if ( self::is_portal_page() ) {
			self::enqueue();
		}
	}

	public static function enqueue() {
		if ( wp_script_is( 'wdmcp-portal', 'enqueued' ) ) {
			return;
		}
		$s = WDMCP_Helpers::settings();
		wp_enqueue_style( 'wdmcp-portal', WDMCP_URL . 'assets/css/portal.css', array(), WDMCP_VERSION );
		wp_add_inline_style(
			'wdmcp-portal',
			'.wdmcp{--wdmcp-brand:' . WDMCP_Helpers::sanitize_hex( $s['brand_color'], '#213c7a' ) . ';--wdmcp-accent:' . WDMCP_Helpers::sanitize_hex( $s['accent_color'], '#00c375' ) . ';}'
		);
		wp_enqueue_script( 'wdmcp-portal', WDMCP_URL . 'assets/js/portal.js', array(), WDMCP_VERSION, true );
		wp_localize_script(
			'wdmcp-portal',
			'WDMCP',
			array(
				'ajax'     => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'wdmcp_portal' ),
				'maxBytes' => WDMCP_Helpers::max_upload_bytes(),
				'maxLabel' => size_format( WDMCP_Helpers::max_upload_bytes() ),
				'types'    => WDMCP_Helpers::allowed_extensions(),
				'i18n'     => array(
					'tooBig'       => __( 'Too large — max %s', 'wdm-client-portal' ),
					'badType'      => __( '.%s files aren’t accepted', 'wdm-client-portal' ),
					'send1'        => __( 'Send 1 file', 'wdm-client-portal' ),
					'sendN'        => __( 'Send %d files', 'wdm-client-portal' ),
					'sending'      => __( 'Sending…', 'wdm-client-portal' ),
					'sent1'        => __( 'File sent. We’ve been notified.', 'wdm-client-portal' ),
					'sentN'        => __( '%d files sent. We’ve been notified.', 'wdm-client-portal' ),
					'someFailed'   => __( 'Some files didn’t upload. They’re still in the list — try again.', 'wdm-client-portal' ),
					'failed'       => __( 'Upload failed', 'wdm-client-portal' ),
					'confirmLeave' => __( 'Your files are still uploading. Leave anyway?', 'wdm-client-portal' ),
					'confirmDel'   => __( 'Remove “%s”? This can’t be undone.', 'wdm-client-portal' ),
					'removed'      => __( 'File removed.', 'wdm-client-portal' ),
					'saved'        => __( 'Saved.', 'wdm-client-portal' ),
					'error'        => __( 'Something went wrong. Please try again.', 'wdm-client-portal' ),
					'pasted'       => __( 'Screenshot added from clipboard.', 'wdm-client-portal' ),
					'morning'      => __( 'Good morning', 'wdm-client-portal' ),
					'afternoon'    => __( 'Good afternoon', 'wdm-client-portal' ),
					'evening'      => __( 'Good evening', 'wdm-client-portal' ),
				),
			)
		);
	}

	/* ---------- Sign-in ---------- */

	public static function handle_login() {
		if ( empty( $_POST['wdmcp_login'] ) ) {
			return;
		}
		if ( ! isset( $_POST['_wdmcp_login_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['_wdmcp_login_nonce'] ), 'wdmcp_login' ) ) {
			self::$login_error = __( 'Your session expired. Please try again.', 'wdm-client-portal' );
			return;
		}
		$login = isset( $_POST['log'] ) ? sanitize_text_field( wp_unslash( $_POST['log'] ) ) : '';
		$pass  = isset( $_POST['pwd'] ) ? (string) wp_unslash( $_POST['pwd'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		if ( '' === $login || '' === $pass ) {
			self::$login_error = __( 'Please enter your email and password.', 'wdm-client-portal' );
			return;
		}
		$user = wp_signon(
			array(
				'user_login'    => $login,
				'user_password' => $pass,
				'remember'      => ! empty( $_POST['rememberme'] ),
			),
			is_ssl()
		);
		if ( is_wp_error( $user ) ) {
			// Deliberately vague: don't reveal whether the account exists.
			self::$login_error = __( 'That email and password don’t match. Please try again, or reset your password.', 'wdm-client-portal' );
			return;
		}
		wp_safe_redirect( WDMCP_Helpers::is_client( $user->ID ) ? WDMCP_Helpers::portal_url() : admin_url( 'admin.php?page=wdmcp' ) );
		exit;
	}

	public static function login_redirect( $redirect_to, $requested, $user ) {
		if ( $user instanceof WP_User && WDMCP_Helpers::is_client( $user->ID ) ) {
			return WDMCP_Helpers::portal_url();
		}
		return $redirect_to;
	}

	public static function block_admin() {
		if ( wp_doing_ajax() || ( defined( 'DOING_CRON' ) && DOING_CRON ) ) {
			return;
		}
		global $pagenow;
		if ( 'admin-post.php' === $pagenow ) {
			return; // Downloads.
		}
		if ( WDMCP_Helpers::is_client() && ! current_user_can( 'edit_posts' ) ) {
			wp_safe_redirect( WDMCP_Helpers::portal_url() );
			exit;
		}
	}

	public static function admin_bar( $show ) {
		return WDMCP_Helpers::is_client() ? false : $show;
	}

	public static function record_login( $login, $user ) {
		if ( WDMCP_Helpers::is_client( $user->ID ) ) {
			update_user_meta( $user->ID, 'wdmcp_last_login', WDMCP_Helpers::now() );
		}
	}

	public static function brand_login_screen() {
		$s     = WDMCP_Helpers::settings();
		$brand = WDMCP_Helpers::sanitize_hex( $s['brand_color'], '#213c7a' );
		$css   = 'body.login{background:#f3f5f9}'
			. '.login form{border:1px solid #e4e8f0;border-radius:14px;box-shadow:0 10px 30px rgba(16,24,40,.06)}'
			. '.wp-core-ui .button-primary{background:' . $brand . ';border-color:' . $brand . ';border-radius:8px}'
			. '.wp-core-ui .button-primary:hover,.wp-core-ui .button-primary:focus{background:' . $brand . ';filter:brightness(1.12)}'
			. '.login #backtoblog a,.login #nav a{color:' . $brand . '}';
		if ( $s['logo_url'] ) {
			$css .= '.login h1 a{background-image:url(' . esc_url( $s['logo_url'] ) . ');background-size:contain;width:240px;height:70px}';
		}
		wp_register_style( 'wdmcp-login', false, array(), WDMCP_VERSION );
		wp_enqueue_style( 'wdmcp-login' );
		wp_add_inline_style( 'wdmcp-login', $css );
	}

	public static function portal_or_home() {
		return WDMCP_Helpers::get( 'portal_page_id' ) ? WDMCP_Helpers::portal_url() : home_url( '/' );
	}

	public static function company_name() {
		return WDMCP_Helpers::get( 'company_name' );
	}

	/* ---------- AJAX ---------- */

	private static function guard() {
		check_ajax_referer( 'wdmcp_portal', 'nonce' );
		if ( ! WDMCP_Helpers::is_client() ) {
			wp_send_json_error( array( 'message' => __( 'Please sign in again.', 'wdm-client-portal' ) ), 403 );
		}
		return get_current_user_id();
	}

	/** One file per request so the browser can show real progress for each. */
	public static function ajax_upload() {
		$uid = self::guard();
		$req = isset( $_POST['request_id'] ) ? absint( $_POST['request_id'] ) : 0;
		if ( $req ) {
			$r = WDMCP_Requests::get( $req );
			if ( ! $r || (int) $r->client_id !== $uid || 'done' === $r->status ) {
				$req = 0;
			}
		}
		$note = isset( $_POST['note'] ) ? sanitize_textarea_field( wp_unslash( $_POST['note'] ) ) : '';
		$id   = WDMCP_Files::store(
			isset( $_FILES['file'] ) ? $_FILES['file'] : null, // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			$uid,
			'in',
			array(
				'note'       => $note,
				'request_id' => $req,
			)
		);
		if ( is_wp_error( $id ) ) {
			wp_send_json_error( array( 'message' => $id->get_error_message() ), 400 );
		}
		wp_send_json_success( array( 'id' => $id ) );
	}

	/** Called once after a batch: one notification, one activity entry, request status update. */
	public static function ajax_upload_done() {
		$uid   = self::guard();
		$ids   = isset( $_POST['ids'] ) ? array_map( 'absint', (array) wp_unslash( $_POST['ids'] ) ) : array();
		$files = array();
		foreach ( array_slice( array_unique( $ids ), 0, 100 ) as $id ) {
			$f = WDMCP_Files::get( $id );
			// Only this client's own, freshly uploaded files.
			if ( $f && (int) $f->client_id === $uid && 'in' === $f->direction && strtotime( $f->created_at . ' UTC' ) > time() - DAY_IN_SECONDS ) {
				$files[] = $f;
			}
		}
		if ( $files ) {
			$names = wp_list_pluck( $files, 'original_name' );
			$msg   = 1 === count( $files )
				/* translators: %s: file name */
				? sprintf( __( 'uploaded %s', 'wdm-client-portal' ), $names[0] )
				/* translators: 1: count, 2: file names */
				: sprintf( __( 'uploaded %1$d files (%2$s)', 'wdm-client-portal' ), count( $files ), implode( ', ', array_slice( $names, 0, 3 ) ) . ( count( $names ) > 3 ? ', …' : '' ) );
			WDMCP_Activity::log( $uid, 'upload', $msg );

			foreach ( array_unique( array_filter( wp_list_pluck( $files, 'request_id' ) ) ) as $rid ) {
				$r = WDMCP_Requests::get( $rid );
				if ( $r && 'open' === $r->status ) {
					WDMCP_Requests::set_status( $rid, 'submitted' );
				}
			}
			WDMCP_Notify::client_uploaded( $uid, $files );
		}
		wp_send_json_success( WDMCP_View::partials( $uid ) );
	}

	public static function ajax_delete() {
		$uid  = self::guard();
		$id   = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		$file = WDMCP_Files::get( $id );
		if ( ! $file || (int) $file->client_id !== $uid || 'in' !== $file->direction || 'received' !== $file->status ) {
			wp_send_json_error( array( 'message' => __( 'This file can’t be removed — we may already be working on it. Contact us if you need it gone.', 'wdm-client-portal' ) ), 400 );
		}
		WDMCP_Files::delete( $id );
		/* translators: %s: file name */
		WDMCP_Activity::log( $uid, 'delete', sprintf( __( 'removed %s', 'wdm-client-portal' ), $file->original_name ) );
		wp_send_json_success( WDMCP_View::partials( $uid ) );
	}

	public static function ajax_seen() {
		$uid = self::guard();
		update_user_meta( $uid, 'wdmcp_seen_shared', WDMCP_Helpers::now() );
		wp_send_json_success();
	}

	public static function ajax_account() {
		$uid  = self::guard();
		$user = get_userdata( $uid );
		$data = array( 'ID' => $uid );

		$first = isset( $_POST['first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['first_name'] ) ) : '';
		$last  = isset( $_POST['last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['last_name'] ) ) : '';
		if ( '' !== $first ) {
			$data['first_name']   = $first;
			$data['last_name']    = $last;
			$data['display_name'] = trim( $first . ' ' . $last );
		}

		$new = isset( $_POST['new_password'] ) ? (string) wp_unslash( $_POST['new_password'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		if ( '' !== $new ) {
			$cur = isset( $_POST['current_password'] ) ? (string) wp_unslash( $_POST['current_password'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			if ( ! wp_check_password( $cur, $user->user_pass, $uid ) ) {
				wp_send_json_error( array( 'message' => __( 'Your current password isn’t right.', 'wdm-client-portal' ) ), 400 );
			}
			if ( strlen( $new ) < 8 ) {
				wp_send_json_error( array( 'message' => __( 'Please use at least 8 characters for your new password.', 'wdm-client-portal' ) ), 400 );
			}
			$data['user_pass'] = $new;
		}

		$res = wp_update_user( $data );
		if ( is_wp_error( $res ) ) {
			wp_send_json_error( array( 'message' => $res->get_error_message() ), 400 );
		}
		update_user_meta( $uid, 'wdmcp_email_updates', empty( $_POST['email_updates'] ) ? '0' : '1' );

		$reload = false;
		if ( isset( $data['user_pass'] ) ) {
			// wp_update_user() re-issues this session's cookie; reload so the page gets a fresh nonce.
			$reload = true;
			WDMCP_Activity::log( $uid, 'account', __( 'updated the account password', 'wdm-client-portal' ) );
		}
		wp_send_json_success(
			array(
				'name'    => get_userdata( $uid )->display_name,
				'first'   => WDMCP_Helpers::first_name( $uid ),
				'message' => __( 'Your account is updated.', 'wdm-client-portal' ),
				'reload'  => $reload,
			)
		);
	}
}
