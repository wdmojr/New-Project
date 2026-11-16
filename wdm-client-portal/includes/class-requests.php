<?php
/**
 * File requests: "Here's what we need from you" checklist items.
 * Status flow: open -> submitted (client uploaded) -> done (team confirmed).
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_Requests {

	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'wdmcp_requests';
	}

	public static function create( $client_id, $title, $details = '', $due = '' ) {
		global $wpdb;
		$due = preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $due ) ? $due : null;
		$wpdb->insert(
			self::table(),
			array(
				'client_id'  => (int) $client_id,
				'created_by' => get_current_user_id(),
				'title'      => sanitize_text_field( $title ),
				'details'    => sanitize_textarea_field( $details ),
				'due_date'   => $due,
				'status'     => 'open',
				'created_at' => WDMCP_Helpers::now(),
			)
		);
		return (int) $wpdb->insert_id;
	}

	public static function get( $id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::table() . ' WHERE id = %d', $id ) );
	}

	/** @param string[] $statuses */
	public static function for_client( $client_id, $statuses = array( 'open', 'submitted' ) ) {
		global $wpdb;
		$in = implode( ',', array_fill( 0, count( $statuses ), '%s' ) );
		return $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM ' . self::table() . " WHERE client_id = %d AND status IN ($in) ORDER BY (status = 'open') DESC, (due_date IS NULL), due_date ASC, id DESC",
				array_merge( array( $client_id ), $statuses )
			)
		);
	}

	public static function set_status( $id, $status ) {
		if ( ! in_array( $status, array( 'open', 'submitted', 'done' ), true ) ) {
			return false;
		}
		global $wpdb;
		return false !== $wpdb->update(
			self::table(),
			array(
				'status'       => $status,
				'completed_at' => 'done' === $status ? WDMCP_Helpers::now() : null,
			),
			array( 'id' => (int) $id )
		);
	}

	public static function delete( $id ) {
		global $wpdb;
		return (bool) $wpdb->delete( self::table(), array( 'id' => (int) $id ) );
	}

	public static function count_open( $client_id = 0 ) {
		global $wpdb;
		if ( $client_id ) {
			return (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM ' . self::table() . " WHERE client_id = %d AND status = 'open'", $client_id ) );
		}
		return (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . self::table() . " WHERE status = 'open'" );
	}

	public static function due_label( $req ) {
		if ( empty( $req->due_date ) ) {
			return '';
		}
		$due   = strtotime( $req->due_date . ' 00:00:00' );
		$today = strtotime( wp_date( 'Y-m-d' ) . ' 00:00:00' );
		$days  = (int) round( ( $due - $today ) / DAY_IN_SECONDS );
		if ( $days < 0 ) {
			return __( 'Overdue', 'wdm-client-portal' );
		}
		if ( 0 === $days ) {
			return __( 'Due today', 'wdm-client-portal' );
		}
		if ( 1 === $days ) {
			return __( 'Due tomorrow', 'wdm-client-portal' );
		}
		/* translators: %s: date */
		return sprintf( __( 'Due %s', 'wdm-client-portal' ), date_i18n( 'M j', $due ) );
	}
}
