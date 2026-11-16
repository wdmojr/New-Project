<?php
/**
 * Runs when the plugin is deleted. Data is only removed if the admin opted in.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

$settings = get_option( 'wdmcp_settings', array() );
if ( empty( $settings['delete_on_uninstall'] ) ) {
	return;
}

global $wpdb;
foreach ( array( 'wdmcp_files', 'wdmcp_requests', 'wdmcp_activity' ) as $table ) {
	$wpdb->query( "DROP TABLE IF EXISTS {$wpdb->prefix}{$table}" ); // phpcs:ignore WordPress.DB
}

// Delete stored files.
$upload = wp_upload_dir( null, false );
$dir    = trailingslashit( $upload['basedir'] ) . 'wdm-client-portal';
if ( is_dir( $dir ) ) {
	$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::CHILD_FIRST );
	foreach ( $it as $f ) {
		$f->isDir() ? rmdir( $f->getPathname() ) : unlink( $f->getPathname() ); // phpcs:ignore
	}
	rmdir( $dir ); // phpcs:ignore
}

$wpdb->query( "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'wdmcp\\_%'" ); // phpcs:ignore WordPress.DB
delete_option( 'wdmcp_settings' );
delete_option( 'wdmcp_db_version' );

$admin = get_role( 'administrator' );
if ( $admin ) {
	$admin->remove_cap( 'wdmcp_manage' );
	$admin->remove_cap( 'wdmcp_portal_access' );
}
// The "Portal Client" role is kept so client accounts don't lose their role silently.
