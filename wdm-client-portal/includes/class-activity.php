<?php
/**
 * Simple activity timeline. Messages are stored as a verb phrase ("uploaded 2 files")
 * and shown with the actor's name in front ("You uploaded 2 files").
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_Activity {

	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'wdmcp_activity';
	}

	public static function log( $client_id, $type, $message, $actor_id = null ) {
		global $wpdb;
		$wpdb->insert(
			self::table(),
			array(
				'client_id'  => (int) $client_id,
				'actor_id'   => null === $actor_id ? get_current_user_id() : (int) $actor_id,
				'type'       => sanitize_key( $type ),
				'message'    => mb_substr( wp_strip_all_tags( $message ), 0, 500 ),
				'created_at' => WDMCP_Helpers::now(),
			)
		);
	}

	public static function for_client( $client_id, $limit = 10 ) {
		global $wpdb;
		return $wpdb->get_results(
			$wpdb->prepare( 'SELECT * FROM ' . self::table() . ' WHERE client_id = %d ORDER BY created_at DESC, id DESC LIMIT %d', $client_id, $limit )
		);
	}

	public static function recent( $limit = 10, $client_actions_only = false ) {
		global $wpdb;
		$where = $client_actions_only ? 'WHERE actor_id = client_id' : '';
		return $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM ' . self::table() . " $where ORDER BY created_at DESC, id DESC LIMIT %d", $limit ) );
	}

	public static function last_for_client( $client_id ) {
		global $wpdb;
		return $wpdb->get_var( $wpdb->prepare( 'SELECT MAX(created_at) FROM ' . self::table() . ' WHERE client_id = %d', $client_id ) );
	}

	/** Name to show for the actor, from the point of view of $viewer_id. */
	public static function actor_name( $row, $viewer_id ) {
		if ( (int) $row->actor_id === (int) $viewer_id ) {
			return __( 'You', 'wdm-client-portal' );
		}
		$user = get_userdata( $row->actor_id );
		if ( ! $user ) {
			return WDMCP_Helpers::get( 'company_name' );
		}
		return WDMCP_Helpers::is_client( $user->ID ) ? $user->display_name : WDMCP_Helpers::first_name( $user );
	}
}
