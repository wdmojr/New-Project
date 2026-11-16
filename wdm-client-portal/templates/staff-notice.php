<?php
/**
 * Shown when a staff member (or a non-client user) opens the portal page.
 */

defined( 'ABSPATH' ) || exit;
?>
<div class="wdmcp wdmcp-auth wdmcp-auth--single">
	<div class="wdmcp-auth__panel">
		<span class="wdmcp-wordmark"><?php echo esc_html( WDMCP_Helpers::get( 'company_name' ) ); ?></span>
		<?php if ( WDMCP_Helpers::can_manage() ) : ?>
			<h1><?php esc_html_e( 'You’re signed in as staff', 'wdm-client-portal' ); ?></h1>
			<p class="wdmcp-auth__lead"><?php esc_html_e( 'This page is what your clients see. Manage clients, files and requests from the dashboard.', 'wdm-client-portal' ); ?></p>
			<a class="wdmcp-btn wdmcp-btn--primary wdmcp-btn--block wdmcp-btn--lg" href="<?php echo esc_url( admin_url( 'admin.php?page=wdmcp' ) ); ?>"><?php esc_html_e( 'Go to Client Portal admin', 'wdm-client-portal' ); ?></a>
		<?php else : ?>
			<h1><?php esc_html_e( 'This account doesn’t have portal access', 'wdm-client-portal' ); ?></h1>
			<p class="wdmcp-auth__lead"><?php esc_html_e( 'If you think this is a mistake, please contact us and we’ll get you set up.', 'wdm-client-portal' ); ?></p>
			<a class="wdmcp-btn wdmcp-btn--ghost wdmcp-btn--block" href="<?php echo esc_url( wp_logout_url( WDMCP_Helpers::portal_url() ) ); ?>"><?php esc_html_e( 'Sign out', 'wdm-client-portal' ); ?></a>
		<?php endif; ?>
	</div>
</div>
