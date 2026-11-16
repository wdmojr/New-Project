<?php
/**
 * Client dashboard.
 *
 * @var WP_User $user
 */

defined( 'ABSPATH' ) || exit;

$s        = WDMCP_Helpers::settings();
$uid      = (int) $user->ID;
$company  = WDMCP_Helpers::company( $uid );
$note     = (string) get_user_meta( $uid, 'wdmcp_project_note', true );
$manager  = WDMCP_Helpers::manager_for( $uid );
$parts    = WDMCP_View::partials( $uid );
$tab      = ( isset( $_GET['tab'] ) && 'shared' === $_GET['tab'] ) ? 'shared' : 'uploads'; // phpcs:ignore WordPress.Security.NonceVerification
$types    = WDMCP_Helpers::allowed_extensions();
$emails   = WDMCP_Notify::client_wants_email( $uid );
$initials = strtoupper( mb_substr( $user->first_name ? $user->first_name : $user->display_name, 0, 1 ) . mb_substr( (string) $user->last_name, 0, 1 ) );
$links    = array_filter(
	array(
		array( 'calendar', __( 'Book a call', 'wdm-client-portal' ), $s['booking_url'] ),
		array( 'card', __( 'Pay an invoice', 'wdm-client-portal' ), $s['payment_url'] ),
		array( 'mail', __( 'Email us', 'wdm-client-portal' ), $s['contact_email'] ? 'mailto:' . $s['contact_email'] : '' ),
		array( 'phone', __( 'Call us', 'wdm-client-portal' ), $s['contact_phone'] ? 'tel:' . preg_replace( '/[^0-9+]/', '', $s['contact_phone'] ) : '' ),
	),
	function ( $l ) {
		return ! empty( $l[2] );
	}
);
?>
<div class="wdmcp wdmcp-app" id="wdmcp" data-tab="<?php echo esc_attr( $tab ); ?>">

	<header class="wdmcp-top">
		<div class="wdmcp-top__inner">
			<a class="wdmcp-top__brand" href="<?php echo esc_url( WDMCP_Helpers::portal_url() ); ?>">
				<?php if ( $s['logo_url'] ) : ?>
					<img src="<?php echo esc_url( $s['logo_url'] ); ?>" alt="<?php echo esc_attr( $s['company_name'] ); ?>" class="wdmcp-logo wdmcp-logo--sm">
				<?php else : ?>
					<span class="wdmcp-wordmark"><?php echo esc_html( $s['company_name'] ); ?></span>
				<?php endif; ?>
				<span class="wdmcp-top__tag"><?php esc_html_e( 'Client Portal', 'wdm-client-portal' ); ?></span>
			</a>
			<div class="wdmcp-top__user">
				<button type="button" class="wdmcp-userbtn" data-wdmcp-open="account" aria-haspopup="dialog">
					<span class="wdmcp-avatar" aria-hidden="true"><?php echo esc_html( $initials ); ?></span>
					<span class="wdmcp-userbtn__name" data-wdmcp-name><?php echo esc_html( $user->display_name ); ?></span>
				</button>
				<a class="wdmcp-btn wdmcp-btn--ghost wdmcp-btn--sm" href="<?php echo esc_url( wp_logout_url( WDMCP_Helpers::portal_url() ) ); ?>">
					<?php echo WDMCP_View::icon( 'logout', 16 ); // phpcs:ignore ?>
					<span class="wdmcp-hide-sm"><?php esc_html_e( 'Sign out', 'wdm-client-portal' ); ?></span>
				</a>
			</div>
		</div>
	</header>

	<main class="wdmcp-wrap">
		<section class="wdmcp-hello">
			<h1><span data-wdmcp-greeting><?php esc_html_e( 'Welcome back', 'wdm-client-portal' ); ?></span>, <span data-wdmcp-first><?php echo esc_html( WDMCP_Helpers::first_name( $user ) ); ?></span></h1>
			<p>
				<?php
				if ( $company ) {
					/* translators: %s: client company */
					echo esc_html( sprintf( __( 'Everything for %s, in one place.', 'wdm-client-portal' ), $company ) );
				} else {
					esc_html_e( 'Everything for your project, in one place.', 'wdm-client-portal' );
				}
				?>
			</p>
		</section>

		<?php if ( $s['announcement'] ) : ?>
			<div class="wdmcp-banner" role="note">
				<?php echo WDMCP_View::icon( 'megaphone', 18 ); // phpcs:ignore ?>
				<div><?php echo wp_kses_post( wpautop( $s['announcement'] ) ); ?></div>
			</div>
		<?php endif; ?>

		<?php if ( $note ) : ?>
			<div class="wdmcp-banner wdmcp-banner--note" role="note">
				<?php echo WDMCP_View::icon( 'pin', 18 ); // phpcs:ignore ?>
				<div>
					<strong><?php esc_html_e( 'A note from our team', 'wdm-client-portal' ); ?></strong>
					<?php echo wp_kses_post( wpautop( $note ) ); ?>
				</div>
			</div>
		<?php endif; ?>

		<div class="wdmcp-grid">
			<div class="wdmcp-main">

				<div data-wdmcp-slot="requests"><?php echo $parts['requests']; // phpcs:ignore ?></div>

				<!-- Upload -->
				<section class="wdmcp-card" id="wdmcp-upload" aria-labelledby="wdmcp-up-h">
					<div class="wdmcp-card__head">
						<h2 id="wdmcp-up-h"><?php echo WDMCP_View::icon( 'upload' ); // phpcs:ignore ?> <?php esc_html_e( 'Send us files', 'wdm-client-portal' ); ?></h2>
					</div>

					<div class="wdmcp-for" data-wdmcp-for hidden>
						<span><?php esc_html_e( 'For:', 'wdm-client-portal' ); ?> <strong data-wdmcp-for-title></strong></span>
						<button type="button" class="wdmcp-icon-btn" data-wdmcp-for-clear aria-label="<?php esc_attr_e( 'Don’t link to this request', 'wdm-client-portal' ); ?>"><?php echo WDMCP_View::icon( 'x', 16 ); // phpcs:ignore ?></button>
					</div>

					<div class="wdmcp-drop" data-wdmcp-drop tabindex="0" role="button" aria-describedby="wdmcp-drop-hint">
						<input type="file" multiple data-wdmcp-input hidden>
						<span class="wdmcp-drop__icon"><?php echo WDMCP_View::icon( 'upload', 28 ); // phpcs:ignore ?></span>
						<p class="wdmcp-drop__title">
							<span class="wdmcp-drop__desk"><?php esc_html_e( 'Drag files here, or', 'wdm-client-portal' ); ?>
							<span class="wdmcp-link"><?php esc_html_e( 'browse your computer', 'wdm-client-portal' ); ?></span></span>
							<span class="wdmcp-drop__touch"><span class="wdmcp-link"><?php esc_html_e( 'Tap to choose files', 'wdm-client-portal' ); ?></span></span>
						</p>
						<p class="wdmcp-drop__hint" id="wdmcp-drop-hint">
							<?php
							/* translators: %s: size */
							echo esc_html( sprintf( __( 'Up to %s per file. You can also paste a screenshot.', 'wdm-client-portal' ), size_format( WDMCP_Helpers::max_upload_bytes() ) ) );
							?>
							<button type="button" class="wdmcp-link wdmcp-link--muted" data-wdmcp-types><?php esc_html_e( 'Accepted types', 'wdm-client-portal' ); ?></button>
						</p>
						<p class="wdmcp-drop__types" data-wdmcp-types-list hidden><?php echo esc_html( implode( ', ', array_map( 'strtoupper', $types ) ) ); ?></p>
					</div>

					<div class="wdmcp-queue" data-wdmcp-queue-wrap hidden>
						<ul class="wdmcp-queue__list" data-wdmcp-queue></ul>
						<label class="wdmcp-field">
							<span><?php esc_html_e( 'Add a note (optional)', 'wdm-client-portal' ); ?></span>
							<textarea rows="2" data-wdmcp-note maxlength="1000" placeholder="<?php esc_attr_e( 'e.g. Here are the photos for the About page.', 'wdm-client-portal' ); ?>"></textarea>
						</label>
						<div class="wdmcp-queue__actions">
							<button type="button" class="wdmcp-btn wdmcp-btn--ghost" data-wdmcp-clear><?php esc_html_e( 'Clear', 'wdm-client-portal' ); ?></button>
							<button type="button" class="wdmcp-btn wdmcp-btn--primary wdmcp-btn--lg" data-wdmcp-send><?php esc_html_e( 'Send files', 'wdm-client-portal' ); ?></button>
						</div>
					</div>
				</section>

				<!-- Files -->
				<section class="wdmcp-card wdmcp-card--flush" aria-label="<?php esc_attr_e( 'Your files', 'wdm-client-portal' ); ?>">
					<div class="wdmcp-tabs" role="tablist">
						<button type="button" role="tab" class="wdmcp-tab" id="wdmcp-tab-uploads" aria-controls="wdmcp-panel-uploads" aria-selected="<?php echo 'uploads' === $tab ? 'true' : 'false'; ?>" data-wdmcp-tab="uploads">
							<?php esc_html_e( 'Your uploads', 'wdm-client-portal' ); ?>
							<span class="wdmcp-tab__n" data-wdmcp-n="uploads"><?php echo (int) $parts['counts']['uploads']; ?></span>
						</button>
						<button type="button" role="tab" class="wdmcp-tab" id="wdmcp-tab-shared" aria-controls="wdmcp-panel-shared" aria-selected="<?php echo 'shared' === $tab ? 'true' : 'false'; ?>" data-wdmcp-tab="shared">
							<?php esc_html_e( 'Shared with you', 'wdm-client-portal' ); ?>
							<span class="wdmcp-tab__n" data-wdmcp-n="shared"><?php echo (int) $parts['counts']['shared']; ?></span>
							<span class="wdmcp-dot" data-wdmcp-unseen <?php echo $parts['counts']['unseen'] ? '' : 'hidden'; ?>><?php echo (int) $parts['counts']['unseen']; ?> <?php esc_html_e( 'new', 'wdm-client-portal' ); ?></span>
						</button>
						<label class="wdmcp-search">
							<?php echo WDMCP_View::icon( 'search', 16 ); // phpcs:ignore ?>
							<input type="search" data-wdmcp-search placeholder="<?php esc_attr_e( 'Search files', 'wdm-client-portal' ); ?>" aria-label="<?php esc_attr_e( 'Search files', 'wdm-client-portal' ); ?>">
						</label>
					</div>
					<div class="wdmcp-panel" role="tabpanel" id="wdmcp-panel-uploads" aria-labelledby="wdmcp-tab-uploads" data-wdmcp-slot="uploads" <?php echo 'uploads' === $tab ? '' : 'hidden'; ?>><?php echo $parts['uploads']; // phpcs:ignore ?></div>
					<div class="wdmcp-panel" role="tabpanel" id="wdmcp-panel-shared" aria-labelledby="wdmcp-tab-shared" data-wdmcp-slot="shared" <?php echo 'shared' === $tab ? '' : 'hidden'; ?>><?php echo $parts['shared']; // phpcs:ignore ?></div>
					<p class="wdmcp-noresults" data-wdmcp-noresults hidden><?php esc_html_e( 'No files match your search.', 'wdm-client-portal' ); ?></p>
				</section>
			</div>

			<aside class="wdmcp-side">
				<?php if ( $manager ) : ?>
					<section class="wdmcp-card wdmcp-contact">
						<h2 class="wdmcp-eyebrow"><?php esc_html_e( 'Your contact', 'wdm-client-portal' ); ?></h2>
						<div class="wdmcp-contact__row">
							<?php
							$m_init = strtoupper( mb_substr( $manager->first_name ? $manager->first_name : $manager->display_name, 0, 1 ) . mb_substr( (string) $manager->last_name, 0, 1 ) );
							$m_img  = get_avatar_url( $manager->ID, array( 'size' => 96, 'default' => '404' ) );
							?>
							<span class="wdmcp-avatar wdmcp-avatar--lg" aria-hidden="true"><?php echo esc_html( $m_init ); ?><?php if ( $m_img ) : ?><img src="<?php echo esc_url( $m_img ); ?>" alt="" onerror="this.remove()"><?php endif; ?></span>
							<div>
								<strong><?php echo esc_html( $manager->display_name ); ?></strong>
								<span><?php echo esc_html( $s['company_name'] ); ?></span>
							</div>
						</div>
						<a class="wdmcp-btn wdmcp-btn--ghost wdmcp-btn--block wdmcp-btn--sm" href="mailto:<?php echo esc_attr( $manager->user_email ); ?>"><?php echo WDMCP_View::icon( 'mail', 16 ); // phpcs:ignore ?> <?php echo esc_html( $manager->user_email ); ?></a>
					</section>
				<?php endif; ?>

				<?php if ( $links ) : ?>
					<section class="wdmcp-card">
						<h2 class="wdmcp-eyebrow"><?php esc_html_e( 'Quick links', 'wdm-client-portal' ); ?></h2>
						<ul class="wdmcp-links">
							<?php foreach ( $links as $l ) : ?>
								<?php $external = 0 === strpos( $l[2], 'http' ); ?>
								<li><a href="<?php echo esc_url( $l[2], array( 'http', 'https', 'mailto', 'tel' ) ); ?>" <?php echo $external ? 'target="_blank" rel="noopener"' : ''; ?>><?php echo WDMCP_View::icon( $l[0], 18 ); // phpcs:ignore ?> <?php echo esc_html( $l[1] ); ?></a></li>
							<?php endforeach; ?>
						</ul>
					</section>
				<?php endif; ?>

				<section class="wdmcp-card">
					<h2 class="wdmcp-eyebrow"><?php esc_html_e( 'Recent activity', 'wdm-client-portal' ); ?></h2>
					<div data-wdmcp-slot="activity"><?php echo $parts['activity']; // phpcs:ignore ?></div>
				</section>
			</aside>
		</div>

		<footer class="wdmcp-foot">
			<?php echo WDMCP_View::icon( 'lock', 14 ); // phpcs:ignore ?>
			<?php
			/* translators: %s: company */
			echo esc_html( sprintf( __( 'Your files are private to you and the %s team.', 'wdm-client-portal' ), $s['company_name'] ) );
			?>
		</footer>
	</main>

	<!-- Account dialog -->
	<dialog class="wdmcp-dialog" data-wdmcp-dialog="account" aria-labelledby="wdmcp-acc-h">
		<form class="wdmcp-form" data-wdmcp-account method="dialog">
			<div class="wdmcp-dialog__head">
				<h2 id="wdmcp-acc-h"><?php esc_html_e( 'Your account', 'wdm-client-portal' ); ?></h2>
				<button type="button" class="wdmcp-icon-btn" data-wdmcp-close aria-label="<?php esc_attr_e( 'Close', 'wdm-client-portal' ); ?>"><?php echo WDMCP_View::icon( 'x', 18 ); // phpcs:ignore ?></button>
			</div>
			<div class="wdmcp-dialog__body">
				<div class="wdmcp-field-row">
					<label class="wdmcp-field"><span><?php esc_html_e( 'First name', 'wdm-client-portal' ); ?></span><input type="text" name="first_name" value="<?php echo esc_attr( $user->first_name ); ?>" autocomplete="given-name" required></label>
					<label class="wdmcp-field"><span><?php esc_html_e( 'Last name', 'wdm-client-portal' ); ?></span><input type="text" name="last_name" value="<?php echo esc_attr( $user->last_name ); ?>" autocomplete="family-name"></label>
				</div>
				<label class="wdmcp-field"><span><?php esc_html_e( 'Email', 'wdm-client-portal' ); ?></span><input type="email" value="<?php echo esc_attr( $user->user_email ); ?>" disabled></label>
				<p class="wdmcp-muted wdmcp-small"><?php esc_html_e( 'To change your sign-in email, just ask us.', 'wdm-client-portal' ); ?></p>

				<label class="wdmcp-toggle">
					<input type="checkbox" name="email_updates" value="1" <?php checked( $emails ); ?>>
					<span class="wdmcp-toggle__ui" aria-hidden="true"></span>
					<span><strong><?php esc_html_e( 'Email me', 'wdm-client-portal' ); ?></strong><br><span class="wdmcp-muted wdmcp-small"><?php esc_html_e( 'when you share a file or need something from me', 'wdm-client-portal' ); ?></span></span>
				</label>

				<details class="wdmcp-details">
					<summary><?php esc_html_e( 'Change password', 'wdm-client-portal' ); ?></summary>
					<label class="wdmcp-field"><span><?php esc_html_e( 'Current password', 'wdm-client-portal' ); ?></span><input type="password" name="current_password" autocomplete="current-password"></label>
					<label class="wdmcp-field"><span><?php esc_html_e( 'New password', 'wdm-client-portal' ); ?></span><input type="password" name="new_password" minlength="8" autocomplete="new-password"></label>
				</details>
				<div class="wdmcp-alert wdmcp-alert--error" data-wdmcp-account-error hidden role="alert"></div>
			</div>
			<div class="wdmcp-dialog__foot">
				<button type="button" class="wdmcp-btn wdmcp-btn--ghost" data-wdmcp-close><?php esc_html_e( 'Cancel', 'wdm-client-portal' ); ?></button>
				<button type="submit" class="wdmcp-btn wdmcp-btn--primary"><?php esc_html_e( 'Save changes', 'wdm-client-portal' ); ?></button>
			</div>
		</form>
	</dialog>

	<div class="wdmcp-toasts" aria-live="polite" data-wdmcp-toasts></div>
</div>
