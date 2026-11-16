<?php
/**
 * Sign-in screen.
 *
 * @var string $error
 */

defined( 'ABSPATH' ) || exit;

$s        = WDMCP_Helpers::settings();
$lost_url = wp_lostpassword_url( WDMCP_Helpers::portal_url() );
$login_in = isset( $_POST['log'] ) ? sanitize_text_field( wp_unslash( $_POST['log'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
?>
<div class="wdmcp wdmcp-auth">
	<div class="wdmcp-auth__panel">
		<div class="wdmcp-auth__brand">
			<?php if ( $s['logo_url'] ) : ?>
				<img src="<?php echo esc_url( $s['logo_url'] ); ?>" alt="<?php echo esc_attr( $s['company_name'] ); ?>" class="wdmcp-logo">
			<?php else : ?>
				<span class="wdmcp-wordmark"><?php echo esc_html( $s['company_name'] ); ?></span>
			<?php endif; ?>
		</div>

		<h1><?php esc_html_e( 'Sign in to your client portal', 'wdm-client-portal' ); ?></h1>
		<p class="wdmcp-auth__lead"><?php esc_html_e( 'Send us files securely and find everything we’ve shared with you.', 'wdm-client-portal' ); ?></p>

		<?php if ( $error ) : ?>
			<div class="wdmcp-alert wdmcp-alert--error" role="alert"><?php echo esc_html( $error ); ?></div>
		<?php endif; ?>

		<form method="post" class="wdmcp-form" novalidate>
			<?php wp_nonce_field( 'wdmcp_login', '_wdmcp_login_nonce' ); ?>
			<input type="hidden" name="wdmcp_login" value="1">
			<label class="wdmcp-field">
				<span><?php esc_html_e( 'Email', 'wdm-client-portal' ); ?></span>
				<input type="text" name="log" value="<?php echo esc_attr( $login_in ); ?>" autocomplete="username" inputmode="email" required autofocus>
			</label>
			<label class="wdmcp-field">
				<span class="wdmcp-field__row">
					<?php esc_html_e( 'Password', 'wdm-client-portal' ); ?>
					<a href="<?php echo esc_url( $lost_url ); ?>"><?php esc_html_e( 'Forgot password?', 'wdm-client-portal' ); ?></a>
				</span>
				<span class="wdmcp-pass">
					<input type="password" name="pwd" autocomplete="current-password" required>
					<button type="button" class="wdmcp-pass__toggle" data-wdmcp-toggle-pass aria-label="<?php esc_attr_e( 'Show password', 'wdm-client-portal' ); ?>"><?php esc_html_e( 'Show', 'wdm-client-portal' ); ?></button>
				</span>
			</label>
			<label class="wdmcp-check">
				<input type="checkbox" name="rememberme" value="1" checked>
				<span><?php esc_html_e( 'Keep me signed in on this device', 'wdm-client-portal' ); ?></span>
			</label>
			<button type="submit" class="wdmcp-btn wdmcp-btn--primary wdmcp-btn--block wdmcp-btn--lg"><?php esc_html_e( 'Sign in', 'wdm-client-portal' ); ?></button>
		</form>

		<p class="wdmcp-auth__foot">
			<?php echo WDMCP_View::icon( 'lock', 14 ); // phpcs:ignore ?>
			<?php esc_html_e( 'Private & secure. Only you and our team can see your files.', 'wdm-client-portal' ); ?>
		</p>
		<?php if ( $s['contact_email'] ) : ?>
			<p class="wdmcp-auth__help">
				<?php esc_html_e( 'Need access?', 'wdm-client-portal' ); ?>
				<a href="mailto:<?php echo esc_attr( $s['contact_email'] ); ?>"><?php esc_html_e( 'Email us', 'wdm-client-portal' ); ?></a>
			</p>
		<?php endif; ?>
	</div>
	<div class="wdmcp-auth__art" aria-hidden="true">
		<div class="wdmcp-auth__art-inner">
			<p class="wdmcp-auth__quote"><?php esc_html_e( 'Everything for your project, in one place.', 'wdm-client-portal' ); ?></p>
			<ul>
				<li><?php echo WDMCP_View::icon( 'upload', 18 ); // phpcs:ignore ?> <?php esc_html_e( 'Drag & drop files to our team', 'wdm-client-portal' ); ?></li>
				<li><?php echo WDMCP_View::icon( 'inbox', 18 ); // phpcs:ignore ?> <?php esc_html_e( 'Download what we share with you', 'wdm-client-portal' ); ?></li>
				<li><?php echo WDMCP_View::icon( 'list', 18 ); // phpcs:ignore ?> <?php esc_html_e( 'See exactly what we need, and when', 'wdm-client-portal' ); ?></li>
			</ul>
		</div>
	</div>
</div>
