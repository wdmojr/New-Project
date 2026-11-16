<?php
/**
 * Branded HTML emails.
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_Notify {

	/**
	 * Send a branded email.
	 *
	 * @param string|string[] $to
	 * @param string          $subject
	 * @param string          $heading
	 * @param string          $body_html Pre-escaped HTML.
	 * @param string          $button    Button label.
	 * @param string          $url       Button link.
	 */
	public static function send( $to, $subject, $heading, $body_html, $button = '', $url = '' ) {
		$s     = WDMCP_Helpers::settings();
		$brand = WDMCP_Helpers::sanitize_hex( $s['brand_color'], '#213c7a' );
		$co    = esc_html( $s['company_name'] );
		$logo  = $s['logo_url'] ? '<img src="' . esc_url( $s['logo_url'] ) . '" alt="' . $co . '" style="max-height:40px;max-width:200px">' : '<strong style="font-size:18px;color:' . $brand . '">' . $co . '</strong>';
		$btn   = $button && $url
			? '<p style="margin:28px 0 8px"><a href="' . esc_url( $url ) . '" style="display:inline-block;background:' . $brand . ';color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">' . esc_html( $button ) . '</a></p>'
			: '';

		$html = '<!doctype html><html><body style="margin:0;background:#f3f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d2433">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;padding:32px 12px"><tr><td align="center">'
			. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e4e8f0">'
			. '<tr><td style="height:4px;background:' . $brand . '"></td></tr>'
			. '<tr><td style="padding:28px 32px 0">' . $logo . '</td></tr>'
			. '<tr><td style="padding:20px 32px 32px;font-size:15px;line-height:1.6">'
			. '<h1 style="font-size:20px;line-height:1.3;margin:0 0 12px;color:#0f1729">' . esc_html( $heading ) . '</h1>'
			. $body_html . $btn
			. '</td></tr></table>'
			. '<p style="font-size:12px;color:#7a8499;margin:16px 0 0">' . $co . ' &middot; ' . esc_html__( 'Client Portal', 'wdm-client-portal' ) . '</p>'
			. '</td></tr></table></body></html>';

		$headers = array( 'Content-Type: text/html; charset=UTF-8' );
		return wp_mail( $to, $subject, $html, $headers );
	}

	public static function team_recipients() {
		$list = array_filter( array_map( 'trim', explode( ',', (string) WDMCP_Helpers::get( 'notify_emails' ) ) ), 'is_email' );
		return $list ? $list : array( get_option( 'admin_email' ) );
	}

	/** Tell the team a client uploaded files (one email per batch). */
	public static function client_uploaded( $client_id, $files ) {
		$client = get_userdata( $client_id );
		if ( ! $client || ! $files ) {
			return;
		}
		$who   = $client->display_name . ( WDMCP_Helpers::company( $client_id ) ? ' (' . WDMCP_Helpers::company( $client_id ) . ')' : '' );
		$items = '';
		$note  = '';
		foreach ( $files as $f ) {
			$items .= '<li>' . esc_html( $f->original_name ) . ' <span style="color:#7a8499">&middot; ' . esc_html( size_format( $f->size ) ) . '</span></li>';
			if ( $f->note && ! $note ) {
				$note = $f->note;
			}
		}
		$body = '<p>' . sprintf(
			/* translators: 1: client name, 2: count */
			esc_html( _n( '%1$s uploaded %2$d file:', '%1$s uploaded %2$d files:', count( $files ), 'wdm-client-portal' ) ),
			'<strong>' . esc_html( $who ) . '</strong>',
			count( $files )
		) . '</p><ul style="padding-left:18px">' . $items . '</ul>';
		if ( $note ) {
			$body .= '<p style="background:#f3f5f9;border-radius:8px;padding:12px 14px;margin:16px 0 0"><strong>' . esc_html__( 'Their note:', 'wdm-client-portal' ) . '</strong><br>' . nl2br( esc_html( $note ) ) . '</p>';
		}
		self::send(
			self::team_recipients(),
			/* translators: %s: client name */
			sprintf( __( 'New files from %s', 'wdm-client-portal' ), $who ),
			__( 'New files received', 'wdm-client-portal' ),
			$body,
			__( 'Open client', 'wdm-client-portal' ),
			WDMCP_Helpers::client_admin_url( $client_id )
		);
	}

	public static function client_wants_email( $client_id ) {
		return '0' !== (string) get_user_meta( $client_id, 'wdmcp_email_updates', true );
	}

	/** Tell a client we shared files with them. */
	public static function files_shared( $client_id, $names, $note = '' ) {
		$client = get_userdata( $client_id );
		if ( ! $client || ! self::client_wants_email( $client_id ) ) {
			return;
		}
		$items = '';
		foreach ( $names as $n ) {
			$items .= '<li>' . esc_html( $n ) . '</li>';
		}
		$body = '<p>' . sprintf(
			/* translators: 1: first name, 2: company */
			esc_html__( 'Hi %1$s, %2$s shared new files with you:', 'wdm-client-portal' ),
			esc_html( WDMCP_Helpers::first_name( $client ) ),
			esc_html( WDMCP_Helpers::get( 'company_name' ) )
		) . '</p><ul style="padding-left:18px">' . $items . '</ul>';
		if ( $note ) {
			$body .= '<p style="background:#f3f5f9;border-radius:8px;padding:12px 14px">' . nl2br( esc_html( $note ) ) . '</p>';
		}
		self::send(
			$client->user_email,
			__( 'New files in your client portal', 'wdm-client-portal' ),
			__( 'You have new files', 'wdm-client-portal' ),
			$body,
			__( 'View files', 'wdm-client-portal' ),
			WDMCP_Helpers::portal_url( array( 'tab' => 'shared' ) )
		);
	}

	/** Tell a client we need something from them. */
	public static function request_created( $client_id, $title, $details, $due_label ) {
		$client = get_userdata( $client_id );
		if ( ! $client || ! self::client_wants_email( $client_id ) ) {
			return;
		}
		$body = '<p>' . sprintf(
			/* translators: %s: first name */
			esc_html__( 'Hi %s, when you have a moment, please upload the following:', 'wdm-client-portal' ),
			esc_html( WDMCP_Helpers::first_name( $client ) )
		) . '</p><p style="border-left:3px solid #e4e8f0;padding-left:12px"><strong>' . esc_html( $title ) . '</strong>'
			. ( $due_label ? ' <span style="color:#7a8499">&middot; ' . esc_html( $due_label ) . '</span>' : '' )
			. ( $details ? '<br>' . nl2br( esc_html( $details ) ) : '' ) . '</p>';
		self::send(
			$client->user_email,
			/* translators: %s: request title */
			sprintf( __( 'Request: %s', 'wdm-client-portal' ), $title ),
			__( 'We need a file from you', 'wdm-client-portal' ),
			$body,
			__( 'Upload now', 'wdm-client-portal' ),
			WDMCP_Helpers::portal_url()
		);
	}

	/** Welcome email with a secure "set your password" link. */
	public static function welcome( $user_id ) {
		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return false;
		}
		$key = get_password_reset_key( $user );
		if ( is_wp_error( $key ) ) {
			return false;
		}
		$set_url = add_query_arg(
			array(
				'action' => 'rp',
				'key'    => $key,
				'login'  => rawurlencode( $user->user_login ),
			),
			wp_login_url()
		);
		$co   = WDMCP_Helpers::get( 'company_name' );
		$body = '<p>' . sprintf(
			/* translators: 1: first name, 2: company */
			esc_html__( 'Hi %1$s, %2$s has set up a private client portal for you. You can use it to send us files securely, download anything we share, and see what we need from you.', 'wdm-client-portal' ),
			esc_html( WDMCP_Helpers::first_name( $user ) ),
			esc_html( $co )
		) . '</p><p>' . esc_html__( 'Click below to choose your password. Then bookmark the portal:', 'wdm-client-portal' )
			. ' <a href="' . esc_url( WDMCP_Helpers::portal_url() ) . '">' . esc_html( WDMCP_Helpers::portal_url() ) . '</a></p>'
			. '<p style="color:#7a8499;font-size:13px">' . sprintf(
				/* translators: %s: username/email */
				esc_html__( 'You’ll sign in with: %s', 'wdm-client-portal' ),
				esc_html( $user->user_email )
			) . '</p>';
		update_user_meta( $user_id, 'wdmcp_invited_at', WDMCP_Helpers::now() );
		return self::send(
			$user->user_email,
			/* translators: %s: company */
			sprintf( __( 'Your %s client portal is ready', 'wdm-client-portal' ), $co ),
			__( 'Welcome to your client portal', 'wdm-client-portal' ),
			$body,
			__( 'Set my password', 'wdm-client-portal' ),
			$set_url
		);
	}
}
