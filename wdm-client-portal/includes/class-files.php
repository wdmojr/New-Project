<?php
/**
 * File storage, records and secure downloads.
 *
 * direction 'in'  = client -> team (client uploads)
 * direction 'out' = team -> client (files we share)
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_Files {

	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'wdmcp_files';
	}

	/**
	 * Validate and store one uploaded file (an entry from $_FILES).
	 *
	 * @return int|WP_Error New file ID.
	 */
	public static function store( $file, $client_id, $direction, $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'note'       => '',
				'request_id' => 0,
				'by'         => get_current_user_id(),
			)
		);

		if ( empty( $file ) || ! isset( $file['error'] ) ) {
			return new WP_Error( 'wdmcp_no_file', __( 'No file was received.', 'wdm-client-portal' ) );
		}
		if ( UPLOAD_ERR_OK !== (int) $file['error'] ) {
			$msg = in_array( (int) $file['error'], array( UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE ), true )
				? __( 'This file is larger than the server allows.', 'wdm-client-portal' )
				: __( 'The upload was interrupted. Please try again.', 'wdm-client-portal' );
			return new WP_Error( 'wdmcp_upload_error', $msg );
		}
		if ( ! is_uploaded_file( $file['tmp_name'] ) ) {
			return new WP_Error( 'wdmcp_upload_error', __( 'Invalid upload.', 'wdm-client-portal' ) );
		}

		$name = sanitize_file_name( wp_basename( $file['name'] ) );
		$size = (int) $file['size'];
		$ext  = strtolower( pathinfo( $name, PATHINFO_EXTENSION ) );

		// Staff may share any non-dangerous type; clients are limited to the allow-list.
		$parts = array_map( 'strtolower', explode( '.', $name ) );
		array_shift( $parts );
		if ( array_intersect( $parts, WDMCP_Helpers::BLOCKED_TYPES ) ) {
			return new WP_Error( 'wdmcp_type', __( 'This type of file can’t be uploaded for security reasons.', 'wdm-client-portal' ) );
		}
		if ( 'in' === $direction && ! in_array( $ext, WDMCP_Helpers::allowed_extensions(), true ) ) {
			/* translators: %s: file extension */
			return new WP_Error( 'wdmcp_type', sprintf( __( '.%s files aren’t accepted. Try zipping it first.', 'wdm-client-portal' ), $ext ) );
		}
		if ( 'in' === $direction && $size > WDMCP_Helpers::max_upload_bytes() ) {
			/* translators: %s: max size */
			return new WP_Error( 'wdmcp_size', sprintf( __( 'Files must be %s or smaller.', 'wdm-client-portal' ), size_format( WDMCP_Helpers::max_upload_bytes() ) ) );
		}

		WDMCP_Install::protect_storage();
		$dir = WDMCP_Install::storage_dir() . '/' . (int) $client_id;
		if ( ! wp_mkdir_p( $dir ) ) {
			return new WP_Error( 'wdmcp_storage', __( 'Storage is not writable. Please contact us.', 'wdm-client-portal' ) );
		}
		if ( ! file_exists( $dir . '/index.php' ) ) {
			file_put_contents( $dir . '/index.php', "<?php\n// Silence is golden.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}

		// Random, extension-less name: nothing guessable, nothing executable.
		$stored = bin2hex( random_bytes( 20 ) ) . '.dat';
		if ( ! @move_uploaded_file( $file['tmp_name'], $dir . '/' . $stored ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors
			return new WP_Error( 'wdmcp_storage', __( 'The file couldn’t be saved. Please try again.', 'wdm-client-portal' ) );
		}

		$type = wp_check_filetype( $name );

		global $wpdb;
		$wpdb->insert(
			self::table(),
			array(
				'client_id'     => (int) $client_id,
				'uploaded_by'   => (int) $args['by'],
				'direction'     => 'out' === $direction ? 'out' : 'in',
				'request_id'    => (int) $args['request_id'],
				'original_name' => $name ? $name : 'file',
				'stored_name'   => $stored,
				'mime'          => $type['type'] ? $type['type'] : 'application/octet-stream',
				'size'          => $size,
				'note'          => sanitize_textarea_field( $args['note'] ),
				'status'        => 'in' === $direction ? 'received' : 'shared',
				'created_at'    => WDMCP_Helpers::now(),
			)
		);
		return (int) $wpdb->insert_id;
	}

	/** Normalize a multi-file $_FILES field into a list of single-file arrays. */
	public static function normalize_multi( $field ) {
		$out = array();
		if ( empty( $field['name'] ) ) {
			return $out;
		}
		if ( ! is_array( $field['name'] ) ) {
			return array( $field );
		}
		foreach ( $field['name'] as $i => $name ) {
			if ( '' === $name ) {
				continue;
			}
			$out[] = array(
				'name'     => $name,
				'type'     => $field['type'][ $i ],
				'tmp_name' => $field['tmp_name'][ $i ],
				'error'    => $field['error'][ $i ],
				'size'     => $field['size'][ $i ],
			);
		}
		return $out;
	}

	public static function get( $id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::table() . ' WHERE id = %d', $id ) );
	}

	public static function for_client( $client_id, $direction, $limit = 200 ) {
		global $wpdb;
		return $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM ' . self::table() . ' WHERE client_id = %d AND direction = %s ORDER BY created_at DESC, id DESC LIMIT %d',
				$client_id,
				$direction,
				$limit
			)
		);
	}

	public static function count( $where = array() ) {
		global $wpdb;
		$sql    = 'SELECT COUNT(*) FROM ' . self::table() . ' WHERE 1=1';
		$params = array();
		foreach ( $where as $col => $val ) {
			if ( in_array( $col, array( 'client_id', 'direction', 'status' ), true ) ) {
				$sql     .= " AND $col = %s";
				$params[] = $val;
			}
		}
		return (int) ( $params ? $wpdb->get_var( $wpdb->prepare( $sql, $params ) ) : $wpdb->get_var( $sql ) );
	}

	/** Number of shared files the client hasn't seen yet. */
	public static function unseen_count( $client_id ) {
		global $wpdb;
		$seen = (string) get_user_meta( $client_id, 'wdmcp_seen_shared', true );
		$seen = $seen ? $seen : '1970-01-01 00:00:00';
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				'SELECT COUNT(*) FROM ' . self::table() . " WHERE client_id = %d AND direction = 'out' AND created_at > %s",
				$client_id,
				$seen
			)
		);
	}

	public static function set_status( $id, $status ) {
		if ( ! array_key_exists( $status, WDMCP_Helpers::file_statuses() ) ) {
			return false;
		}
		global $wpdb;
		return false !== $wpdb->update( self::table(), array( 'status' => $status ), array( 'id' => (int) $id ) );
	}

	public static function path( $file ) {
		return WDMCP_Install::storage_dir() . '/' . (int) $file->client_id . '/' . basename( $file->stored_name );
	}

	public static function delete( $id ) {
		$file = self::get( $id );
		if ( ! $file ) {
			return false;
		}
		$path = self::path( $file );
		if ( file_exists( $path ) ) {
			wp_delete_file( $path );
		}
		global $wpdb;
		return (bool) $wpdb->delete( self::table(), array( 'id' => (int) $id ) );
	}

	public static function download_url( $id ) {
		return wp_nonce_url(
			add_query_arg(
				array(
					'action' => 'wdmcp_download',
					'file'   => (int) $id,
				),
				admin_url( 'admin-post.php' )
			),
			'wdmcp_dl_' . (int) $id
		);
	}

	/** Can the current user see/download this file? */
	public static function user_can_access( $file ) {
		if ( ! $file || ! is_user_logged_in() ) {
			return false;
		}
		return WDMCP_Helpers::can_manage() || (int) $file->client_id === get_current_user_id();
	}

	public static function handle_download() {
		$id   = isset( $_GET['file'] ) ? absint( $_GET['file'] ) : 0;
		$file = self::get( $id );

		if ( ! $file || ! check_admin_referer( 'wdmcp_dl_' . $id ) || ! self::user_can_access( $file ) ) {
			wp_die( esc_html__( 'Sorry, you can’t download this file.', 'wdm-client-portal' ), 403 );
		}
		$path = self::path( $file );
		if ( ! is_readable( $path ) ) {
			wp_die( esc_html__( 'This file is no longer available.', 'wdm-client-portal' ), 404 );
		}

		$uid = get_current_user_id();
		// Staff opening a new client upload moves it to "In review" automatically.
		if ( 'in' === $file->direction && 'received' === $file->status && WDMCP_Helpers::can_manage() ) {
			self::set_status( $file->id, 'in_review' );
		}
		// The client opening a file we shared is logged so the team knows it was seen.
		if ( 'out' === $file->direction && (int) $file->client_id === $uid && empty( $file->downloaded_at ) ) {
			global $wpdb;
			$wpdb->update( self::table(), array( 'downloaded_at' => WDMCP_Helpers::now() ), array( 'id' => $file->id ) );
			/* translators: %s: file name */
			WDMCP_Activity::log( $file->client_id, 'download', sprintf( __( 'downloaded %s', 'wdm-client-portal' ), $file->original_name ) );
		}

		nocache_headers();
		while ( ob_get_level() ) {
			ob_end_clean();
		}
		$name = str_replace( array( '"', "\r", "\n" ), '', $file->original_name );
		header( 'Content-Type: application/octet-stream' );
		header( 'Content-Disposition: attachment; filename="' . $name . '"; filename*=UTF-8\'\'' . rawurlencode( $file->original_name ) );
		header( 'Content-Length: ' . filesize( $path ) );
		header( 'X-Content-Type-Options: nosniff' );
		readfile( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		exit;
	}
}
