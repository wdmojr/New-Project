<?php
/**
 * Server-rendered portal partials, reused by the page and by AJAX refreshes.
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_View {

	/** Inline SVG icons (stroke, 24px grid). */
	public static function icon( $name, $size = 20 ) {
		$paths = array(
			'upload'   => '<path d="M12 16V4m0 0-4 4m4-4 4 4"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
			'download' => '<path d="M12 4v12m0 0-4-4m4 4 4-4"/><path d="M4 18v.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V18"/>',
			'file'     => '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
			'check'    => '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
			'clock'    => '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
			'trash'    => '<path d="M4 7h16M9 7V4.5h6V7m-8.5 0 1 12.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l1-12.5"/>',
			'mail'     => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
			'phone'    => '<path d="M5 4h3.5l1.5 4.5-2 1.5a11 11 0 0 0 6 6l1.5-2L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
			'calendar' => '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4m8-4v4"/>',
			'card'     => '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
			'inbox'    => '<path d="M3 13h5l1.5 3h5l1.5-3h5"/><path d="M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"/>',
			'list'     => '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2"/>',
			'search'   => '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
			'pin'      => '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
			'megaphone'=> '<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
			'x'        => '<path d="M6 6l12 12M18 6 6 18"/>',
			'user'     => '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
			'logout'   => '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
			'lock'     => '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
			'activity' => '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
		);
		$d = isset( $paths[ $name ] ) ? $paths[ $name ] : $paths['file'];
		return '<svg class="wdmcp-i" width="' . (int) $size . '" height="' . (int) $size . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $d . '</svg>';
	}

	public static function file_badge( $name ) {
		$kind = WDMCP_Helpers::file_kind( $name );
		$ext  = strtoupper( substr( pathinfo( $name, PATHINFO_EXTENSION ), 0, 4 ) );
		return '<span class="wdmcp-ext wdmcp-ext--' . esc_attr( $kind ) . '" aria-hidden="true">' . esc_html( $ext ? $ext : 'FILE' ) . '</span>';
	}

	/* ---------- Requests ---------- */

	public static function requests( $client_id ) {
		$reqs = WDMCP_Requests::for_client( $client_id );
		ob_start();
		if ( ! $reqs ) {
			echo '<div id="wdmcp-requests" hidden></div>';
			return ob_get_clean();
		}
		$open = count(
			array_filter(
				$reqs,
				function ( $r ) {
					return 'open' === $r->status;
				}
			)
		);
		?>
		<section class="wdmcp-card wdmcp-requests" id="wdmcp-requests" aria-labelledby="wdmcp-req-h">
			<div class="wdmcp-card__head">
				<h2 id="wdmcp-req-h"><?php echo self::icon( 'list' ); ?> <?php esc_html_e( 'What we need from you', 'wdm-client-portal' ); ?></h2>
				<?php if ( $open ) : ?>
					<span class="wdmcp-count"><?php echo esc_html( sprintf( /* translators: %d: count */ _n( '%d to do', '%d to do', $open, 'wdm-client-portal' ), $open ) ); ?></span>
				<?php else : ?>
					<span class="wdmcp-count wdmcp-count--ok"><?php esc_html_e( 'All sent — thank you!', 'wdm-client-portal' ); ?></span>
				<?php endif; ?>
			</div>
			<ul class="wdmcp-req-list">
				<?php
				foreach ( $reqs as $r ) :
					$due     = WDMCP_Requests::due_label( $r );
					$overdue = $due && 'open' === $r->status && ( strtotime( $r->due_date ) < strtotime( wp_date( 'Y-m-d' ) ) );
					?>
					<li class="wdmcp-req wdmcp-req--<?php echo esc_attr( $r->status ); ?>">
						<span class="wdmcp-req__check" aria-hidden="true"><?php echo 'submitted' === $r->status ? self::icon( 'check', 16 ) : ''; ?></span>
						<div class="wdmcp-req__body">
							<strong><?php echo esc_html( $r->title ); ?></strong>
							<?php if ( $r->details ) : ?>
								<p><?php echo nl2br( esc_html( $r->details ) ); ?></p>
							<?php endif; ?>
							<div class="wdmcp-req__meta">
								<?php if ( 'submitted' === $r->status ) : ?>
									<span class="wdmcp-pill wdmcp-pill--in_review"><?php esc_html_e( 'Sent — we’re reviewing', 'wdm-client-portal' ); ?></span>
								<?php elseif ( $due ) : ?>
									<span class="wdmcp-pill <?php echo $overdue ? 'wdmcp-pill--late' : 'wdmcp-pill--due'; ?>"><?php echo self::icon( 'calendar', 13 ); ?> <?php echo esc_html( $due ); ?></span>
								<?php endif; ?>
							</div>
						</div>
						<button type="button" class="wdmcp-btn <?php echo 'open' === $r->status ? 'wdmcp-btn--primary' : 'wdmcp-btn--ghost'; ?> wdmcp-btn--sm" data-wdmcp-request="<?php echo (int) $r->id; ?>" data-title="<?php echo esc_attr( $r->title ); ?>">
							<?php echo self::icon( 'upload', 16 ); ?>
							<?php echo 'open' === $r->status ? esc_html__( 'Upload', 'wdm-client-portal' ) : esc_html__( 'Add more', 'wdm-client-portal' ); ?>
						</button>
					</li>
				<?php endforeach; ?>
			</ul>
		</section>
		<?php
		return ob_get_clean();
	}

	/* ---------- File lists ---------- */

	public static function file_rows( $client_id, $direction ) {
		$files = WDMCP_Files::for_client( $client_id, $direction );
		$seen  = (string) get_user_meta( $client_id, 'wdmcp_seen_shared', true );
		ob_start();
		if ( ! $files ) {
			?>
			<div class="wdmcp-empty">
				<?php echo self::icon( 'in' === $direction ? 'upload' : 'inbox', 28 ); ?>
				<?php if ( 'in' === $direction ) : ?>
					<p><strong><?php esc_html_e( 'Nothing uploaded yet', 'wdm-client-portal' ); ?></strong><br><?php esc_html_e( 'Files you send us will show up here so you always have a record.', 'wdm-client-portal' ); ?></p>
				<?php else : ?>
					<p><strong><?php esc_html_e( 'No files from us yet', 'wdm-client-portal' ); ?></strong><br><?php esc_html_e( 'When we share proposals, reports or deliverables, you’ll find them here.', 'wdm-client-portal' ); ?></p>
				<?php endif; ?>
			</div>
			<?php
			return ob_get_clean();
		}
		echo '<ul class="wdmcp-files">';
		foreach ( $files as $f ) {
			$is_new = 'out' === $direction && ( ! $seen || $f->created_at > $seen );
			$can_rm = 'in' === $direction && 'received' === $f->status && (int) $f->uploaded_by === get_current_user_id();
			?>
			<li class="wdmcp-file" data-name="<?php echo esc_attr( strtolower( $f->original_name ) ); ?>">
				<?php echo self::file_badge( $f->original_name ); ?>
				<div class="wdmcp-file__main">
					<a class="wdmcp-file__name" href="<?php echo esc_url( WDMCP_Files::download_url( $f->id ) ); ?>" title="<?php esc_attr_e( 'Download', 'wdm-client-portal' ); ?>"><?php echo esc_html( $f->original_name ); ?></a>
					<?php if ( $is_new ) : ?>
						<span class="wdmcp-new"><?php esc_html_e( 'New', 'wdm-client-portal' ); ?></span>
					<?php endif; ?>
					<div class="wdmcp-file__meta">
						<span><?php echo esc_html( size_format( $f->size, 1 ) ); ?></span>
						<span title="<?php echo esc_attr( WDMCP_Helpers::full_date( $f->created_at ) ); ?>"><?php echo esc_html( WDMCP_Helpers::when( $f->created_at ) ); ?></span>
						<?php
						if ( 'out' === $direction ) {
							$by = get_userdata( $f->uploaded_by );
							if ( $by ) {
								/* translators: %s: name */
								echo '<span>' . esc_html( sprintf( __( 'from %s', 'wdm-client-portal' ), WDMCP_Helpers::first_name( $by ) ) ) . '</span>';
							}
						}
						?>
					</div>
					<?php if ( $f->note ) : ?>
						<p class="wdmcp-file__note"><?php echo esc_html( $f->note ); ?></p>
					<?php endif; ?>
				</div>
				<?php if ( 'in' === $direction ) : ?>
					<span class="wdmcp-pill wdmcp-pill--<?php echo esc_attr( $f->status ); ?>"><?php echo esc_html( WDMCP_Helpers::status_label( $f->status ) ); ?></span>
				<?php endif; ?>
				<div class="wdmcp-file__actions">
					<a class="wdmcp-icon-btn" href="<?php echo esc_url( WDMCP_Files::download_url( $f->id ) ); ?>" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: file */ __( 'Download %s', 'wdm-client-portal' ), $f->original_name ) ); ?>"><?php echo self::icon( 'download', 18 ); ?></a>
					<?php if ( $can_rm ) : ?>
						<button type="button" class="wdmcp-icon-btn wdmcp-icon-btn--danger" data-wdmcp-delete="<?php echo (int) $f->id; ?>" data-name="<?php echo esc_attr( $f->original_name ); ?>" aria-label="<?php echo esc_attr( sprintf( /* translators: %s: file */ __( 'Remove %s', 'wdm-client-portal' ), $f->original_name ) ); ?>"><?php echo self::icon( 'trash', 18 ); ?></button>
					<?php endif; ?>
				</div>
			</li>
			<?php
		}
		echo '</ul>';
		return ob_get_clean();
	}

	/* ---------- Activity ---------- */

	public static function activity( $client_id, $limit = 8 ) {
		$rows = WDMCP_Activity::for_client( $client_id, $limit );
		ob_start();
		if ( ! $rows ) {
			echo '<p class="wdmcp-muted">' . esc_html__( 'Your activity will appear here.', 'wdm-client-portal' ) . '</p>';
			return ob_get_clean();
		}
		echo '<ol class="wdmcp-timeline">';
		foreach ( $rows as $r ) {
			echo '<li class="wdmcp-timeline__item wdmcp-timeline__item--' . esc_attr( $r->type ) . '"><span class="wdmcp-timeline__dot" aria-hidden="true"></span><div><p><strong>'
				. esc_html( WDMCP_Activity::actor_name( $r, get_current_user_id() ) ) . '</strong> ' . esc_html( $r->message ) . '</p><time datetime="'
				. esc_attr( mysql2date( 'c', $r->created_at ) ) . '" title="' . esc_attr( WDMCP_Helpers::full_date( $r->created_at ) ) . '">' . esc_html( WDMCP_Helpers::when( $r->created_at ) ) . '</time></div></li>';
		}
		echo '</ol>';
		return ob_get_clean();
	}

	public static function partials( $client_id ) {
		return array(
			'requests' => self::requests( $client_id ),
			'uploads'  => self::file_rows( $client_id, 'in' ),
			'shared'   => self::file_rows( $client_id, 'out' ),
			'activity' => self::activity( $client_id ),
			'counts'   => array(
				'uploads' => WDMCP_Files::count( array( 'client_id' => $client_id, 'direction' => 'in' ) ),
				'shared'  => WDMCP_Files::count( array( 'client_id' => $client_id, 'direction' => 'out' ) ),
				'unseen'  => WDMCP_Files::unseen_count( $client_id ),
			),
		);
	}
}
