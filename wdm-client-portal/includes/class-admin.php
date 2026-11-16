<?php
/**
 * wp-admin screens: Clients, single client, Add client, Settings, dashboard widget.
 */

defined( 'ABSPATH' ) || exit;

class WDMCP_Admin {

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'wp_dashboard_setup', array( __CLASS__, 'dashboard_widget' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( WDMCP_FILE ), array( __CLASS__, 'plugin_links' ) );

		$posts = array( 'add_client', 'save_client', 'add_request', 'request_action', 'file_status', 'delete_file', 'share_files', 'resend_invite', 'save_settings' );
		foreach ( $posts as $p ) {
			add_action( 'admin_post_wdmcp_' . $p, array( __CLASS__, 'post_' . $p ) );
		}
	}

	/* ---------- Menu & assets ---------- */

	public static function menu() {
		$pending = WDMCP_Files::count( array( 'direction' => 'in', 'status' => 'received' ) );
		$bubble  = $pending ? ' <span class="awaiting-mod count-' . $pending . '"><span class="pending-count">' . number_format_i18n( $pending ) . '</span></span>' : '';

		add_menu_page( __( 'Client Portal', 'wdm-client-portal' ), __( 'Client Portal', 'wdm-client-portal' ) . $bubble, 'wdmcp_manage', 'wdmcp', array( __CLASS__, 'page_clients' ), 'dashicons-portfolio', 26 );
		add_submenu_page( 'wdmcp', __( 'Clients', 'wdm-client-portal' ), __( 'Clients', 'wdm-client-portal' ), 'wdmcp_manage', 'wdmcp', array( __CLASS__, 'page_clients' ) );
		add_submenu_page( 'wdmcp', __( 'Add Client', 'wdm-client-portal' ), __( 'Add Client', 'wdm-client-portal' ), 'wdmcp_manage', 'wdmcp-add', array( __CLASS__, 'page_add' ) );
		add_submenu_page( 'wdmcp', __( 'Portal Settings', 'wdm-client-portal' ), __( 'Settings', 'wdm-client-portal' ), 'wdmcp_manage', 'wdmcp-settings', array( __CLASS__, 'page_settings' ) );
	}

	public static function assets( $hook ) {
		if ( false === strpos( (string) $hook, 'wdmcp' ) && 'index.php' !== $hook ) {
			return;
		}
		wp_enqueue_style( 'wdmcp-admin', WDMCP_URL . 'assets/css/admin.css', array(), WDMCP_VERSION );
		if ( false !== strpos( (string) $hook, 'wdmcp-settings' ) ) {
			wp_enqueue_media();
			wp_enqueue_style( 'wp-color-picker' );
			wp_enqueue_script( 'wdmcp-admin', WDMCP_URL . 'assets/js/admin.js', array( 'jquery', 'wp-color-picker' ), WDMCP_VERSION, true );
		} else {
			wp_enqueue_script( 'wdmcp-admin', WDMCP_URL . 'assets/js/admin.js', array( 'jquery' ), WDMCP_VERSION, true );
		}
	}

	public static function plugin_links( $links ) {
		array_unshift(
			$links,
			'<a href="' . esc_url( admin_url( 'admin.php?page=wdmcp-settings' ) ) . '">' . esc_html__( 'Settings', 'wdm-client-portal' ) . '</a>'
		);
		return $links;
	}

	/* ---------- Helpers ---------- */

	private static function check( $nonce_action ) {
		if ( ! WDMCP_Helpers::can_manage() ) {
			wp_die( esc_html__( 'You don’t have permission to do that.', 'wdm-client-portal' ), 403 );
		}
		check_admin_referer( $nonce_action );
	}

	private static function back( $url, $msg = '', $type = 'success' ) {
		if ( $msg ) {
			set_transient( 'wdmcp_notice_' . get_current_user_id(), array( $msg, $type ), 60 );
		}
		wp_safe_redirect( $url );
		exit;
	}

	private static function notice() {
		$key = 'wdmcp_notice_' . get_current_user_id();
		$n   = get_transient( $key );
		if ( $n ) {
			delete_transient( $key );
			echo '<div class="notice notice-' . esc_attr( $n[1] ) . ' is-dismissible"><p>' . esc_html( $n[0] ) . '</p></div>';
		}
	}

	private static function clients( $search = '' ) {
		$args = array(
			'role'    => 'wdm_client',
			'orderby' => 'display_name',
			'number'  => 500,
		);
		if ( $search ) {
			$args['search']         = '*' . $search . '*';
			$args['search_columns'] = array( 'user_login', 'user_email', 'display_name' );
		}
		$users = get_users( $args );
		if ( $search ) {
			// Also match by company name.
			$by_company = get_users(
				array(
					'role'       => 'wdm_client',
					'meta_query' => array( // phpcs:ignore WordPress.DB.SlowDBQuery
						array(
							'key'     => 'wdmcp_company',
							'value'   => $search,
							'compare' => 'LIKE',
						),
					),
				)
			);
			$ids   = wp_list_pluck( $users, 'ID' );
			foreach ( $by_company as $u ) {
				if ( ! in_array( $u->ID, $ids, true ) ) {
					$users[] = $u;
				}
			}
		}
		return $users;
	}

	private static function header( $title, $actions = '' ) {
		echo '<div class="wrap wdmcp-admin"><div class="wdmcp-admin__head"><h1>' . esc_html( $title ) . '</h1>' . $actions . '</div>'; // phpcs:ignore
		self::notice();
	}

	/* ---------- Clients list ---------- */

	public static function page_clients() {
		if ( ! empty( $_GET['client'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
			self::page_client( absint( $_GET['client'] ) ); // phpcs:ignore WordPress.Security.NonceVerification
			return;
		}
		$search  = isset( $_GET['s'] ) ? sanitize_text_field( wp_unslash( $_GET['s'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		$clients = self::clients( $search );

		self::header(
			__( 'Clients', 'wdm-client-portal' ),
			'<a href="' . esc_url( admin_url( 'admin.php?page=wdmcp-add' ) ) . '" class="page-title-action">' . esc_html__( 'Add client', 'wdm-client-portal' ) . '</a>'
			. '<a href="' . esc_url( WDMCP_Helpers::portal_url() ) . '" class="page-title-action" target="_blank">' . esc_html__( 'View portal', 'wdm-client-portal' ) . '</a>'
		);

		$pending = WDMCP_Files::count( array( 'direction' => 'in', 'status' => 'received' ) );
		$open    = WDMCP_Requests::count_open();
		?>
		<div class="wdmcp-stats">
			<div class="wdmcp-stat"><span><?php esc_html_e( 'Clients', 'wdm-client-portal' ); ?></span><strong><?php echo esc_html( count( self::clients() ) ); ?></strong></div>
			<div class="wdmcp-stat <?php echo $pending ? 'is-hot' : ''; ?>"><span><?php esc_html_e( 'New uploads to review', 'wdm-client-portal' ); ?></span><strong><?php echo esc_html( $pending ); ?></strong></div>
			<div class="wdmcp-stat"><span><?php esc_html_e( 'Open requests', 'wdm-client-portal' ); ?></span><strong><?php echo esc_html( $open ); ?></strong></div>
		</div>

		<form method="get" class="wdmcp-search-form">
			<input type="hidden" name="page" value="wdmcp">
			<input type="search" name="s" value="<?php echo esc_attr( $search ); ?>" placeholder="<?php esc_attr_e( 'Search name, email or company…', 'wdm-client-portal' ); ?>">
			<button class="button"><?php esc_html_e( 'Search', 'wdm-client-portal' ); ?></button>
		</form>

		<?php if ( ! $clients ) : ?>
			<div class="wdmcp-panel wdmcp-empty-admin">
				<?php if ( $search ) : ?>
					<p><?php esc_html_e( 'No clients match your search.', 'wdm-client-portal' ); ?></p>
				<?php else : ?>
					<h2><?php esc_html_e( 'Add your first client', 'wdm-client-portal' ); ?></h2>
					<p><?php esc_html_e( 'They’ll get a welcome email with a link to set their password and open the portal.', 'wdm-client-portal' ); ?></p>
					<a class="button button-primary button-hero" href="<?php echo esc_url( admin_url( 'admin.php?page=wdmcp-add' ) ); ?>"><?php esc_html_e( 'Add client', 'wdm-client-portal' ); ?></a>
				<?php endif; ?>
			</div>
		<?php else : ?>
			<table class="widefat striped wdmcp-table">
				<thead><tr>
					<th><?php esc_html_e( 'Client', 'wdm-client-portal' ); ?></th>
					<th><?php esc_html_e( 'New uploads', 'wdm-client-portal' ); ?></th>
					<th><?php esc_html_e( 'Files', 'wdm-client-portal' ); ?></th>
					<th><?php esc_html_e( 'Open requests', 'wdm-client-portal' ); ?></th>
					<th><?php esc_html_e( 'Last activity', 'wdm-client-portal' ); ?></th>
					<th><?php esc_html_e( 'Last sign-in', 'wdm-client-portal' ); ?></th>
				</tr></thead>
				<tbody>
				<?php
				foreach ( $clients as $c ) :
					$new   = WDMCP_Files::count( array( 'client_id' => $c->ID, 'direction' => 'in', 'status' => 'received' ) );
					$total = WDMCP_Files::count( array( 'client_id' => $c->ID ) );
					$reqs  = WDMCP_Requests::count_open( $c->ID );
					$last  = WDMCP_Activity::last_for_client( $c->ID );
					$login = get_user_meta( $c->ID, 'wdmcp_last_login', true );
					$co    = WDMCP_Helpers::company( $c->ID );
					?>
					<tr>
						<td>
							<a class="wdmcp-client-link" href="<?php echo esc_url( WDMCP_Helpers::client_admin_url( $c->ID ) ); ?>">
								<?php echo get_avatar( $c->ID, 32 ); ?>
								<span><strong><?php echo esc_html( $co ? $co : $c->display_name ); ?></strong><br><small><?php echo esc_html( $co ? $c->display_name . ' · ' . $c->user_email : $c->user_email ); ?></small></span>
							</a>
						</td>
						<td><?php echo $new ? '<span class="wdmcp-badge is-hot">' . esc_html( $new ) . '</span>' : '<span class="wdmcp-dim">—</span>'; ?></td>
						<td><?php echo esc_html( $total ); ?></td>
						<td><?php echo $reqs ? esc_html( $reqs ) : '<span class="wdmcp-dim">—</span>'; ?></td>
						<td><?php echo $last ? esc_html( WDMCP_Helpers::when( $last ) ) : '<span class="wdmcp-dim">—</span>'; ?></td>
						<td><?php echo $login ? esc_html( WDMCP_Helpers::when( $login ) ) : '<span class="wdmcp-dim">' . esc_html__( 'Never', 'wdm-client-portal' ) . '</span>'; ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>
		</div>
		<?php
	}

	/* ---------- Single client ---------- */

	private static function page_client( $client_id ) {
		$c = get_userdata( $client_id );
		if ( ! $c || ! WDMCP_Helpers::is_client( $client_id ) ) {
			echo '<div class="wrap"><h1>' . esc_html__( 'Client not found', 'wdm-client-portal' ) . '</h1></div>';
			return;
		}
		$co      = WDMCP_Helpers::company( $client_id );
		$note    = (string) get_user_meta( $client_id, 'wdmcp_project_note', true );
		$mgr     = (int) get_user_meta( $client_id, 'wdmcp_manager_id', true );
		$in      = WDMCP_Files::for_client( $client_id, 'in' );
		$out     = WDMCP_Files::for_client( $client_id, 'out' );
		$reqs    = WDMCP_Requests::for_client( $client_id, array( 'open', 'submitted', 'done' ) );
		$login   = get_user_meta( $client_id, 'wdmcp_last_login', true );
		$invited = get_user_meta( $client_id, 'wdmcp_invited_at', true );

		echo '<div class="wrap wdmcp-admin">';
		echo '<p class="wdmcp-crumb"><a href="' . esc_url( admin_url( 'admin.php?page=wdmcp' ) ) . '">&larr; ' . esc_html__( 'All clients', 'wdm-client-portal' ) . '</a></p>';
		?>
		<div class="wdmcp-client-head">
			<?php echo get_avatar( $client_id, 56 ); ?>
			<div>
				<h1><?php echo esc_html( $co ? $co : $c->display_name ); ?></h1>
				<p>
					<?php echo esc_html( $c->display_name ); ?> &middot; <a href="mailto:<?php echo esc_attr( $c->user_email ); ?>"><?php echo esc_html( $c->user_email ); ?></a>
					&middot;
					<?php
					if ( $login ) {
						/* translators: %s: time */
						echo esc_html( sprintf( __( 'Last signed in %s', 'wdm-client-portal' ), WDMCP_Helpers::when( $login ) ) );
					} elseif ( $invited ) {
						/* translators: %s: time */
						echo esc_html( sprintf( __( 'Invited %s · hasn’t signed in yet', 'wdm-client-portal' ), WDMCP_Helpers::when( $invited ) ) );
					} else {
						esc_html_e( 'Hasn’t signed in yet', 'wdm-client-portal' );
					}
					?>
				</p>
			</div>
			<div class="wdmcp-client-head__actions">
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<?php wp_nonce_field( 'wdmcp_resend_' . $client_id ); ?>
					<input type="hidden" name="action" value="wdmcp_resend_invite">
					<input type="hidden" name="client" value="<?php echo (int) $client_id; ?>">
					<button class="button"><?php esc_html_e( 'Send sign-in link', 'wdm-client-portal' ); ?></button>
				</form>
				<a class="button" href="<?php echo esc_url( get_edit_user_link( $client_id ) ); ?>"><?php esc_html_e( 'Edit user', 'wdm-client-portal' ); ?></a>
			</div>
		</div>
		<?php self::notice(); ?>

		<div class="wdmcp-cols">
			<div class="wdmcp-col-main">

				<!-- Files from client -->
				<section class="wdmcp-panel">
					<h2><?php esc_html_e( 'Files from client', 'wdm-client-portal' ); ?> <span class="wdmcp-dim">(<?php echo count( $in ); ?>)</span></h2>
					<?php self::file_table( $in, true ); ?>
				</section>

				<!-- Share with client -->
				<section class="wdmcp-panel">
					<h2><?php esc_html_e( 'Share files with client', 'wdm-client-portal' ); ?></h2>
					<form method="post" enctype="multipart/form-data" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="wdmcp-share">
						<?php wp_nonce_field( 'wdmcp_share_' . $client_id ); ?>
						<input type="hidden" name="action" value="wdmcp_share_files">
						<input type="hidden" name="client" value="<?php echo (int) $client_id; ?>">
						<label class="wdmcp-dropfield">
							<input type="file" name="files[]" multiple required>
							<span><?php esc_html_e( 'Choose files or drag them here', 'wdm-client-portal' ); ?></span>
						</label>
						<p><textarea name="note" rows="2" class="large-text" placeholder="<?php esc_attr_e( 'Optional message, e.g. “Here’s the March report.”', 'wdm-client-portal' ); ?>"></textarea></p>
						<p class="wdmcp-inline">
							<label><input type="checkbox" name="notify" value="1" checked> <?php esc_html_e( 'Email the client', 'wdm-client-portal' ); ?></label>
							<button class="button button-primary"><?php esc_html_e( 'Share files', 'wdm-client-portal' ); ?></button>
						</p>
					</form>
					<?php if ( $out ) : ?>
						<h3><?php esc_html_e( 'Shared so far', 'wdm-client-portal' ); ?></h3>
						<?php self::file_table( $out, false ); ?>
					<?php endif; ?>
				</section>
			</div>

			<div class="wdmcp-col-side">
				<!-- Requests -->
				<section class="wdmcp-panel">
					<h2><?php esc_html_e( 'File requests', 'wdm-client-portal' ); ?></h2>
					<p class="description"><?php esc_html_e( 'Ask for something specific. It shows as a to-do on their dashboard.', 'wdm-client-portal' ); ?></p>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="wdmcp-req-form">
						<?php wp_nonce_field( 'wdmcp_req_' . $client_id ); ?>
						<input type="hidden" name="action" value="wdmcp_add_request">
						<input type="hidden" name="client" value="<?php echo (int) $client_id; ?>">
						<input type="text" name="title" class="widefat" required placeholder="<?php esc_attr_e( 'e.g. High-res logo files', 'wdm-client-portal' ); ?>">
						<textarea name="details" rows="2" class="widefat" placeholder="<?php esc_attr_e( 'Details (optional)', 'wdm-client-portal' ); ?>"></textarea>
						<div class="wdmcp-inline">
							<label><?php esc_html_e( 'Due', 'wdm-client-portal' ); ?> <input type="date" name="due"></label>
							<label><input type="checkbox" name="notify" value="1" checked> <?php esc_html_e( 'Email client', 'wdm-client-portal' ); ?></label>
						</div>
						<button class="button button-primary"><?php esc_html_e( 'Add request', 'wdm-client-portal' ); ?></button>
					</form>
					<?php if ( $reqs ) : ?>
						<ul class="wdmcp-req-admin">
							<?php foreach ( $reqs as $r ) : ?>
								<li class="is-<?php echo esc_attr( $r->status ); ?>">
									<div>
										<strong><?php echo esc_html( $r->title ); ?></strong>
										<span class="wdmcp-status wdmcp-status--<?php echo esc_attr( $r->status ); ?>">
											<?php
											$labels = array(
												'open'      => __( 'Waiting on client', 'wdm-client-portal' ),
												'submitted' => __( 'Client uploaded', 'wdm-client-portal' ),
												'done'      => __( 'Complete', 'wdm-client-portal' ),
											);
											echo esc_html( $labels[ $r->status ] );
											?>
										</span>
										<?php if ( $r->due_date && 'done' !== $r->status ) : ?>
											<small class="wdmcp-dim"><?php echo esc_html( WDMCP_Requests::due_label( $r ) ); ?></small>
										<?php endif; ?>
									</div>
									<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
										<?php wp_nonce_field( 'wdmcp_reqa_' . $r->id ); ?>
										<input type="hidden" name="action" value="wdmcp_request_action">
										<input type="hidden" name="id" value="<?php echo (int) $r->id; ?>">
										<?php if ( 'done' !== $r->status ) : ?>
											<button class="button-link" name="do" value="done"><?php esc_html_e( 'Mark complete', 'wdm-client-portal' ); ?></button>
										<?php else : ?>
											<button class="button-link" name="do" value="open"><?php esc_html_e( 'Reopen', 'wdm-client-portal' ); ?></button>
										<?php endif; ?>
										<button class="button-link wdmcp-danger" name="do" value="delete" data-confirm="<?php esc_attr_e( 'Delete this request?', 'wdm-client-portal' ); ?>"><?php esc_html_e( 'Delete', 'wdm-client-portal' ); ?></button>
									</form>
								</li>
							<?php endforeach; ?>
						</ul>
					<?php endif; ?>
				</section>

				<!-- Client details -->
				<section class="wdmcp-panel">
					<h2><?php esc_html_e( 'Client details', 'wdm-client-portal' ); ?></h2>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="wdmcp-stack">
						<?php wp_nonce_field( 'wdmcp_client_' . $client_id ); ?>
						<input type="hidden" name="action" value="wdmcp_save_client">
						<input type="hidden" name="client" value="<?php echo (int) $client_id; ?>">
						<label><?php esc_html_e( 'Company', 'wdm-client-portal' ); ?><input type="text" name="company" class="widefat" value="<?php echo esc_attr( $co ); ?>"></label>
						<label><?php esc_html_e( 'Their contact at your company', 'wdm-client-portal' ); ?>
							<?php self::manager_select( 'manager', $mgr, true ); ?>
						</label>
						<label><?php esc_html_e( 'Pinned note on their dashboard', 'wdm-client-portal' ); ?>
							<textarea name="note" rows="4" class="widefat" placeholder="<?php esc_attr_e( 'e.g. Your new site goes live on the 14th. We just need the final photos!', 'wdm-client-portal' ); ?>"><?php echo esc_textarea( $note ); ?></textarea>
						</label>
						<button class="button"><?php esc_html_e( 'Save details', 'wdm-client-portal' ); ?></button>
					</form>
				</section>

				<!-- Activity -->
				<section class="wdmcp-panel">
					<h2><?php esc_html_e( 'Activity', 'wdm-client-portal' ); ?></h2>
					<?php
					$rows = WDMCP_Activity::for_client( $client_id, 15 );
					if ( ! $rows ) {
						echo '<p class="wdmcp-dim">' . esc_html__( 'No activity yet.', 'wdm-client-portal' ) . '</p>';
					} else {
						echo '<ul class="wdmcp-activity">';
						foreach ( $rows as $a ) {
							echo '<li><strong>' . esc_html( WDMCP_Activity::actor_name( $a, get_current_user_id() ) ) . '</strong> ' . esc_html( $a->message ) . ' <span class="wdmcp-dim" title="' . esc_attr( WDMCP_Helpers::full_date( $a->created_at ) ) . '">' . esc_html( WDMCP_Helpers::when( $a->created_at ) ) . '</span></li>';
						}
						echo '</ul>';
					}
					?>
				</section>
			</div>
		</div>
		</div>
		<?php
	}

	private static function file_table( $files, $incoming ) {
		if ( ! $files ) {
			echo '<p class="wdmcp-dim">' . ( $incoming ? esc_html__( 'Nothing uploaded yet.', 'wdm-client-portal' ) : '' ) . '</p>';
			return;
		}
		?>
		<table class="widefat wdmcp-table wdmcp-files-table">
			<thead><tr>
				<th><?php esc_html_e( 'File', 'wdm-client-portal' ); ?></th>
				<th><?php esc_html_e( 'Size', 'wdm-client-portal' ); ?></th>
				<th><?php esc_html_e( 'Added', 'wdm-client-portal' ); ?></th>
				<th><?php echo $incoming ? esc_html__( 'Status', 'wdm-client-portal' ) : esc_html__( 'Client opened', 'wdm-client-portal' ); ?></th>
				<th></th>
			</tr></thead>
			<tbody>
			<?php foreach ( $files as $f ) : ?>
				<tr class="<?php echo $incoming && 'received' === $f->status ? 'is-new' : ''; ?>">
					<td>
						<a href="<?php echo esc_url( WDMCP_Files::download_url( $f->id ) ); ?>"><strong><?php echo esc_html( $f->original_name ); ?></strong></a>
						<?php
						if ( $f->request_id ) {
							$r = WDMCP_Requests::get( $f->request_id );
							if ( $r ) {
								/* translators: %s: request title */
								echo '<br><small class="wdmcp-dim">' . esc_html( sprintf( __( 'For: %s', 'wdm-client-portal' ), $r->title ) ) . '</small>';
							}
						}
						if ( $f->note ) {
							echo '<br><small class="wdmcp-note">“' . esc_html( $f->note ) . '”</small>';
						}
						?>
					</td>
					<td><?php echo esc_html( size_format( $f->size, 1 ) ); ?></td>
					<td title="<?php echo esc_attr( WDMCP_Helpers::full_date( $f->created_at ) ); ?>"><?php echo esc_html( WDMCP_Helpers::when( $f->created_at ) ); ?></td>
					<td>
						<?php if ( $incoming ) : ?>
							<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
								<?php wp_nonce_field( 'wdmcp_fs_' . $f->id ); ?>
								<input type="hidden" name="action" value="wdmcp_file_status">
								<input type="hidden" name="id" value="<?php echo (int) $f->id; ?>">
								<select name="status" class="wdmcp-autosubmit wdmcp-status-select is-<?php echo esc_attr( $f->status ); ?>">
									<?php foreach ( WDMCP_Helpers::file_statuses() as $k => $label ) : ?>
										<option value="<?php echo esc_attr( $k ); ?>" <?php selected( $f->status, $k ); ?>><?php echo esc_html( $label ); ?></option>
									<?php endforeach; ?>
								</select>
								<noscript><button class="button button-small"><?php esc_html_e( 'Save', 'wdm-client-portal' ); ?></button></noscript>
							</form>
						<?php else : ?>
							<?php echo $f->downloaded_at ? '<span class="wdmcp-yes">&#10003; ' . esc_html( WDMCP_Helpers::when( $f->downloaded_at ) ) . '</span>' : '<span class="wdmcp-dim">' . esc_html__( 'Not yet', 'wdm-client-portal' ) . '</span>'; ?>
						<?php endif; ?>
					</td>
					<td class="wdmcp-actions">
						<a class="button button-small" href="<?php echo esc_url( WDMCP_Files::download_url( $f->id ) ); ?>"><?php esc_html_e( 'Download', 'wdm-client-portal' ); ?></a>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
							<?php wp_nonce_field( 'wdmcp_del_' . $f->id ); ?>
							<input type="hidden" name="action" value="wdmcp_delete_file">
							<input type="hidden" name="id" value="<?php echo (int) $f->id; ?>">
							<button class="button-link wdmcp-danger" data-confirm="<?php esc_attr_e( 'Permanently delete this file?', 'wdm-client-portal' ); ?>"><?php esc_html_e( 'Delete', 'wdm-client-portal' ); ?></button>
						</form>
					</td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<?php
	}

	private static function manager_select( $name, $selected, $allow_default = false ) {
		echo '<select name="' . esc_attr( $name ) . '" class="widefat">';
		echo '<option value="0">' . ( $allow_default ? esc_html__( '— Use default —', 'wdm-client-portal' ) : esc_html__( '— None —', 'wdm-client-portal' ) ) . '</option>';
		foreach ( WDMCP_Helpers::staff_users() as $u ) {
			echo '<option value="' . (int) $u->ID . '" ' . selected( (int) $selected, (int) $u->ID, false ) . '>' . esc_html( $u->display_name . ' (' . $u->user_email . ')' ) . '</option>';
		}
		echo '</select>';
	}

	/* ---------- Add client ---------- */

	public static function page_add() {
		self::header( __( 'Add a client', 'wdm-client-portal' ) );
		?>
		<div class="wdmcp-panel wdmcp-narrow">
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="wdmcp-stack">
				<?php wp_nonce_field( 'wdmcp_add_client' ); ?>
				<input type="hidden" name="action" value="wdmcp_add_client">
				<div class="wdmcp-two">
					<label><?php esc_html_e( 'First name', 'wdm-client-portal' ); ?> <input type="text" name="first_name" class="widefat" required></label>
					<label><?php esc_html_e( 'Last name', 'wdm-client-portal' ); ?> <input type="text" name="last_name" class="widefat"></label>
				</div>
				<label><?php esc_html_e( 'Email', 'wdm-client-portal' ); ?> <input type="email" name="email" class="widefat" required></label>
				<label><?php esc_html_e( 'Company', 'wdm-client-portal' ); ?> <input type="text" name="company" class="widefat"></label>
				<label><?php esc_html_e( 'Their contact at your company', 'wdm-client-portal' ); ?> <?php self::manager_select( 'manager', get_current_user_id(), true ); ?></label>
				<label class="wdmcp-check-row"><input type="checkbox" name="send_welcome" value="1" checked> <?php esc_html_e( 'Send a welcome email with a link to set their password', 'wdm-client-portal' ); ?></label>
				<p><button class="button button-primary button-large"><?php esc_html_e( 'Add client', 'wdm-client-portal' ); ?></button></p>
				<p class="description"><?php esc_html_e( 'Already have a WordPress user for them? Edit that user and change their role to “Portal Client”.', 'wdm-client-portal' ); ?></p>
			</form>
		</div>
		</div>
		<?php
	}

	/* ---------- Settings ---------- */

	public static function page_settings() {
		$s     = WDMCP_Helpers::settings();
		$pages = get_pages( array( 'post_status' => 'publish' ) );
		self::header( __( 'Portal Settings', 'wdm-client-portal' ) );

		$server = isset( $_SERVER['SERVER_SOFTWARE'] ) ? strtolower( sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) ) : '';
		if ( false !== strpos( $server, 'nginx' ) ) {
			echo '<div class="notice notice-info"><p>' . wp_kses_post(
				sprintf(
					/* translators: %s: path */
					__( 'You’re on Nginx, which ignores .htaccess. Files are still safe (random, unguessable names), but for belt-and-braces add <code>location ^~ %s { deny all; }</code> to your server config.', 'wdm-client-portal' ),
					esc_html( wp_make_link_relative( trailingslashit( wp_upload_dir( null, false )['baseurl'] ) . 'wdm-client-portal/' ) )
				)
			) . '</p></div>';
		}
		?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'wdmcp_settings' ); ?>
			<input type="hidden" name="action" value="wdmcp_save_settings">

			<div class="wdmcp-panel">
				<h2><?php esc_html_e( 'Branding', 'wdm-client-portal' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr><th><label for="wdmcp-co"><?php esc_html_e( 'Company name', 'wdm-client-portal' ); ?></label></th>
						<td><input id="wdmcp-co" type="text" name="company_name" class="regular-text" value="<?php echo esc_attr( $s['company_name'] ); ?>"></td></tr>
					<tr><th><?php esc_html_e( 'Logo', 'wdm-client-portal' ); ?></th>
						<td>
							<div class="wdmcp-logo-field">
								<img src="<?php echo esc_url( $s['logo_url'] ); ?>" alt="" data-wdmcp-logo-preview <?php echo $s['logo_url'] ? '' : 'hidden'; ?>>
								<input type="hidden" name="logo_url" value="<?php echo esc_attr( $s['logo_url'] ); ?>" data-wdmcp-logo>
								<button type="button" class="button" data-wdmcp-pick-logo><?php esc_html_e( 'Choose logo', 'wdm-client-portal' ); ?></button>
								<button type="button" class="button-link wdmcp-danger" data-wdmcp-clear-logo <?php echo $s['logo_url'] ? '' : 'hidden'; ?>><?php esc_html_e( 'Remove', 'wdm-client-portal' ); ?></button>
							</div>
							<p class="description"><?php esc_html_e( 'Shown on the sign-in page, the portal header and emails. A wide logo on a transparent background works best.', 'wdm-client-portal' ); ?></p>
						</td></tr>
					<tr><th><?php esc_html_e( 'Colors', 'wdm-client-portal' ); ?></th>
						<td class="wdmcp-colors">
							<label><?php esc_html_e( 'Brand', 'wdm-client-portal' ); ?><br><input type="text" name="brand_color" class="wdmcp-color" value="<?php echo esc_attr( $s['brand_color'] ); ?>" data-default-color="#213c7a"></label>
							<label><?php esc_html_e( 'Accent', 'wdm-client-portal' ); ?><br><input type="text" name="accent_color" class="wdmcp-color" value="<?php echo esc_attr( $s['accent_color'] ); ?>" data-default-color="#00c375"></label>
						</td></tr>
				</table>
			</div>

			<div class="wdmcp-panel">
				<h2><?php esc_html_e( 'Portal page', 'wdm-client-portal' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr><th><label for="wdmcp-page"><?php esc_html_e( 'Page', 'wdm-client-portal' ); ?></label></th>
						<td>
							<select id="wdmcp-page" name="portal_page_id">
								<option value="0"><?php esc_html_e( '— Select —', 'wdm-client-portal' ); ?></option>
								<?php foreach ( $pages as $p ) : ?>
									<option value="<?php echo (int) $p->ID; ?>" <?php selected( (int) $s['portal_page_id'], $p->ID ); ?>><?php echo esc_html( $p->post_title ); ?></option>
								<?php endforeach; ?>
							</select>
							<?php if ( $s['portal_page_id'] ) : ?>
								<a href="<?php echo esc_url( WDMCP_Helpers::portal_url() ); ?>" target="_blank"><?php echo esc_html( WDMCP_Helpers::portal_url() ); ?></a>
							<?php endif; ?>
							<p class="description"><?php esc_html_e( 'The page must contain the [wdm_client_portal] shortcode. One was created for you on activation.', 'wdm-client-portal' ); ?></p>
						</td></tr>
					<tr><th><?php esc_html_e( 'Layout', 'wdm-client-portal' ); ?></th>
						<td><label><input type="checkbox" name="full_screen" value="1" <?php checked( $s['full_screen'] ); ?>> <?php esc_html_e( 'Full-screen portal (recommended): hide the theme’s header, footer and sidebars on the portal page', 'wdm-client-portal' ); ?></label></td></tr>
					<tr><th><label for="wdmcp-ann"><?php esc_html_e( 'Announcement', 'wdm-client-portal' ); ?></label></th>
						<td><textarea id="wdmcp-ann" name="announcement" rows="3" class="large-text" placeholder="<?php esc_attr_e( 'Shown to every client, e.g. “Our office is closed Nov 27–28 for Thanksgiving.” Leave empty to hide.', 'wdm-client-portal' ); ?>"><?php echo esc_textarea( $s['announcement'] ); ?></textarea></td></tr>
				</table>
			</div>

			<div class="wdmcp-panel">
				<h2><?php esc_html_e( 'Uploads & notifications', 'wdm-client-portal' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr><th><label for="wdmcp-notify"><?php esc_html_e( 'Notify these emails', 'wdm-client-portal' ); ?></label></th>
						<td><input id="wdmcp-notify" type="text" name="notify_emails" class="large-text" value="<?php echo esc_attr( $s['notify_emails'] ); ?>">
							<p class="description"><?php esc_html_e( 'When a client uploads files. Separate multiple addresses with commas.', 'wdm-client-portal' ); ?></p></td></tr>
					<tr><th><label for="wdmcp-max"><?php esc_html_e( 'Max file size', 'wdm-client-portal' ); ?></label></th>
						<td><input id="wdmcp-max" type="number" min="1" name="max_file_mb" class="small-text" value="<?php echo (int) $s['max_file_mb']; ?>"> MB
							<p class="description">
								<?php
								/* translators: 1: server limit, 2: effective limit */
								echo esc_html( sprintf( __( 'Your server allows up to %1$s per upload, so clients can upload up to %2$s. Ask your host to raise upload_max_filesize and post_max_size for bigger files.', 'wdm-client-portal' ), size_format( wp_max_upload_size() ), size_format( WDMCP_Helpers::max_upload_bytes() ) ) );
								?>
							</p></td></tr>
					<tr><th><label for="wdmcp-types"><?php esc_html_e( 'Allowed file types', 'wdm-client-portal' ); ?></label></th>
						<td><textarea id="wdmcp-types" name="allowed_types" rows="3" class="large-text code"><?php echo esc_textarea( $s['allowed_types'] ); ?></textarea>
							<p class="description"><?php esc_html_e( 'Comma-separated extensions. Risky types (PHP, HTML, SVG, EXE, scripts…) are always blocked.', 'wdm-client-portal' ); ?></p></td></tr>
				</table>
			</div>

			<div class="wdmcp-panel">
				<h2><?php esc_html_e( 'Contact & quick links', 'wdm-client-portal' ); ?></h2>
				<p class="description"><?php esc_html_e( 'Shown in the client’s sidebar. Leave any field empty to hide it.', 'wdm-client-portal' ); ?></p>
				<table class="form-table" role="presentation">
					<tr><th><?php esc_html_e( 'Default contact person', 'wdm-client-portal' ); ?></th><td><?php self::manager_select( 'default_manager', (int) $s['default_manager'] ); ?></td></tr>
					<tr><th><label for="wdmcp-ce"><?php esc_html_e( 'Contact email', 'wdm-client-portal' ); ?></label></th><td><input id="wdmcp-ce" type="email" name="contact_email" class="regular-text" value="<?php echo esc_attr( $s['contact_email'] ); ?>"></td></tr>
					<tr><th><label for="wdmcp-cp"><?php esc_html_e( 'Phone', 'wdm-client-portal' ); ?></label></th><td><input id="wdmcp-cp" type="text" name="contact_phone" class="regular-text" value="<?php echo esc_attr( $s['contact_phone'] ); ?>"></td></tr>
					<tr><th><label for="wdmcp-bk"><?php esc_html_e( '“Book a call” link', 'wdm-client-portal' ); ?></label></th><td><input id="wdmcp-bk" type="url" name="booking_url" class="regular-text" value="<?php echo esc_attr( $s['booking_url'] ); ?>" placeholder="https://calendly.com/…"></td></tr>
					<tr><th><label for="wdmcp-pay"><?php esc_html_e( '“Pay an invoice” link', 'wdm-client-portal' ); ?></label></th><td><input id="wdmcp-pay" type="url" name="payment_url" class="regular-text" value="<?php echo esc_attr( $s['payment_url'] ); ?>" placeholder="https://…"></td></tr>
				</table>
			</div>

			<div class="wdmcp-panel">
				<h2><?php esc_html_e( 'Uninstall', 'wdm-client-portal' ); ?></h2>
				<label><input type="checkbox" name="delete_on_uninstall" value="1" <?php checked( $s['delete_on_uninstall'] ); ?>> <?php esc_html_e( 'When the plugin is deleted, also delete all portal files and data. (Client user accounts are kept.)', 'wdm-client-portal' ); ?></label>
			</div>

			<?php submit_button( __( 'Save settings', 'wdm-client-portal' ) ); ?>
		</form>
		</div>
		<?php
	}

	/* ---------- Dashboard widget ---------- */

	public static function dashboard_widget() {
		if ( WDMCP_Helpers::can_manage() ) {
			wp_add_dashboard_widget( 'wdmcp_recent', __( 'Client Portal — latest', 'wdm-client-portal' ), array( __CLASS__, 'render_widget' ) );
		}
	}

	public static function render_widget() {
		$rows    = WDMCP_Activity::recent( 8, true );
		$pending = WDMCP_Files::count( array( 'direction' => 'in', 'status' => 'received' ) );
		echo '<div class="wdmcp-widget">';
		if ( $pending ) {
			/* translators: %d: count */
			echo '<p class="wdmcp-widget__hot">' . esc_html( sprintf( _n( '%d new upload waiting for review', '%d new uploads waiting for review', $pending, 'wdm-client-portal' ), $pending ) ) . '</p>';
		}
		if ( ! $rows ) {
			echo '<p class="wdmcp-dim">' . esc_html__( 'No client activity yet.', 'wdm-client-portal' ) . '</p>';
		} else {
			echo '<ul>';
			foreach ( $rows as $r ) {
				$co = WDMCP_Helpers::company( $r->client_id );
				$u  = get_userdata( $r->client_id );
				echo '<li><a href="' . esc_url( WDMCP_Helpers::client_admin_url( $r->client_id ) ) . '"><strong>' . esc_html( $co ? $co : ( $u ? $u->display_name : '#' . $r->client_id ) ) . '</strong></a> '
					. esc_html( $r->message ) . ' <span class="wdmcp-dim">' . esc_html( WDMCP_Helpers::when( $r->created_at ) ) . '</span></li>';
			}
			echo '</ul>';
		}
		echo '<p><a href="' . esc_url( admin_url( 'admin.php?page=wdmcp' ) ) . '">' . esc_html__( 'All clients →', 'wdm-client-portal' ) . '</a></p></div>';
	}

	/* ---------- Form handlers ---------- */

	public static function post_add_client() {
		self::check( 'wdmcp_add_client' );
		$email = isset( $_POST['email'] ) ? sanitize_email( wp_unslash( $_POST['email'] ) ) : '';
		$first = isset( $_POST['first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['first_name'] ) ) : '';
		$last  = isset( $_POST['last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['last_name'] ) ) : '';
		$back  = admin_url( 'admin.php?page=wdmcp-add' );

		if ( ! is_email( $email ) ) {
			self::back( $back, __( 'Please enter a valid email address.', 'wdm-client-portal' ), 'error' );
		}
		if ( email_exists( $email ) ) {
			$existing = get_user_by( 'email', $email );
			if ( $existing && WDMCP_Helpers::is_client( $existing->ID ) ) {
				self::back( WDMCP_Helpers::client_admin_url( $existing->ID ), __( 'That client already exists — here they are.', 'wdm-client-portal' ), 'info' );
			}
			self::back( $back, __( 'A user with that email already exists. Edit that user and set their role to “Portal Client”.', 'wdm-client-portal' ), 'error' );
		}

		$login = sanitize_user( current( explode( '@', $email ) ), true );
		$base  = $login ? $login : 'client';
		$n     = 1;
		while ( username_exists( $login ) || '' === $login ) {
			$login = $base . ( ++$n );
		}

		$uid = wp_insert_user(
			array(
				'user_login'   => $login,
				'user_email'   => $email,
				'user_pass'    => wp_generate_password( 24, true, true ),
				'first_name'   => $first,
				'last_name'    => $last,
				'display_name' => trim( $first . ' ' . $last ) ? trim( $first . ' ' . $last ) : $email,
				'role'         => 'wdm_client',
			)
		);
		if ( is_wp_error( $uid ) ) {
			self::back( $back, $uid->get_error_message(), 'error' );
		}
		update_user_meta( $uid, 'wdmcp_company', isset( $_POST['company'] ) ? sanitize_text_field( wp_unslash( $_POST['company'] ) ) : '' );
		update_user_meta( $uid, 'wdmcp_manager_id', isset( $_POST['manager'] ) ? absint( $_POST['manager'] ) : 0 );
		WDMCP_Activity::log( $uid, 'account', __( 'created the portal account', 'wdm-client-portal' ) );

		$msg = __( 'Client added.', 'wdm-client-portal' );
		if ( ! empty( $_POST['send_welcome'] ) ) {
			$msg = WDMCP_Notify::welcome( $uid )
				? __( 'Client added and welcome email sent.', 'wdm-client-portal' )
				: __( 'Client added, but the welcome email could not be sent. Check your site’s email setup, then use “Send sign-in link”.', 'wdm-client-portal' );
		}
		self::back( WDMCP_Helpers::client_admin_url( $uid ), $msg );
	}

	public static function post_save_client() {
		$cid = isset( $_POST['client'] ) ? absint( $_POST['client'] ) : 0;
		self::check( 'wdmcp_client_' . $cid );
		$old_note = (string) get_user_meta( $cid, 'wdmcp_project_note', true );
		$note     = isset( $_POST['note'] ) ? sanitize_textarea_field( wp_unslash( $_POST['note'] ) ) : '';
		update_user_meta( $cid, 'wdmcp_company', isset( $_POST['company'] ) ? sanitize_text_field( wp_unslash( $_POST['company'] ) ) : '' );
		update_user_meta( $cid, 'wdmcp_manager_id', isset( $_POST['manager'] ) ? absint( $_POST['manager'] ) : 0 );
		update_user_meta( $cid, 'wdmcp_project_note', $note );
		if ( $note && $note !== $old_note ) {
			WDMCP_Activity::log( $cid, 'note', __( 'updated the pinned note', 'wdm-client-portal' ) );
		}
		self::back( WDMCP_Helpers::client_admin_url( $cid ), __( 'Saved.', 'wdm-client-portal' ) );
	}

	public static function post_resend_invite() {
		$cid = isset( $_POST['client'] ) ? absint( $_POST['client'] ) : 0;
		self::check( 'wdmcp_resend_' . $cid );
		$ok = WDMCP_Helpers::is_client( $cid ) && WDMCP_Notify::welcome( $cid );
		self::back(
			WDMCP_Helpers::client_admin_url( $cid ),
			$ok ? __( 'Sign-in link sent.', 'wdm-client-portal' ) : __( 'The email could not be sent. Check your site’s email setup.', 'wdm-client-portal' ),
			$ok ? 'success' : 'error'
		);
	}

	public static function post_add_request() {
		$cid = isset( $_POST['client'] ) ? absint( $_POST['client'] ) : 0;
		self::check( 'wdmcp_req_' . $cid );
		$title   = isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '';
		$details = isset( $_POST['details'] ) ? sanitize_textarea_field( wp_unslash( $_POST['details'] ) ) : '';
		$due     = isset( $_POST['due'] ) ? sanitize_text_field( wp_unslash( $_POST['due'] ) ) : '';
		if ( ! $title || ! WDMCP_Helpers::is_client( $cid ) ) {
			self::back( WDMCP_Helpers::client_admin_url( $cid ), __( 'Please give the request a title.', 'wdm-client-portal' ), 'error' );
		}
		$id = WDMCP_Requests::create( $cid, $title, $details, $due );
		/* translators: %s: title */
		WDMCP_Activity::log( $cid, 'request', sprintf( __( 'requested “%s”', 'wdm-client-portal' ), $title ) );
		if ( ! empty( $_POST['notify'] ) ) {
			WDMCP_Notify::request_created( $cid, $title, $details, WDMCP_Requests::due_label( WDMCP_Requests::get( $id ) ) );
		}
		self::back( WDMCP_Helpers::client_admin_url( $cid ), __( 'Request added.', 'wdm-client-portal' ) );
	}

	public static function post_request_action() {
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		self::check( 'wdmcp_reqa_' . $id );
		$r  = WDMCP_Requests::get( $id );
		$do = isset( $_POST['do'] ) ? sanitize_key( $_POST['do'] ) : '';
		if ( ! $r ) {
			self::back( admin_url( 'admin.php?page=wdmcp' ) );
		}
		if ( 'delete' === $do ) {
			WDMCP_Requests::delete( $id );
		} elseif ( in_array( $do, array( 'done', 'open' ), true ) ) {
			WDMCP_Requests::set_status( $id, $do );
			if ( 'done' === $do ) {
				/* translators: %s: title */
				WDMCP_Activity::log( $r->client_id, 'status', sprintf( __( 'marked “%s” complete', 'wdm-client-portal' ), $r->title ) );
			}
		}
		self::back( WDMCP_Helpers::client_admin_url( $r->client_id ), __( 'Request updated.', 'wdm-client-portal' ) );
	}

	public static function post_file_status() {
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		self::check( 'wdmcp_fs_' . $id );
		$f      = WDMCP_Files::get( $id );
		$status = isset( $_POST['status'] ) ? sanitize_key( $_POST['status'] ) : '';
		if ( $f && $f->status !== $status && WDMCP_Files::set_status( $id, $status ) && 'done' === $status ) {
			/* translators: %s: file */
			WDMCP_Activity::log( $f->client_id, 'status', sprintf( __( 'marked %s as done', 'wdm-client-portal' ), $f->original_name ) );
		}
		self::back( $f ? WDMCP_Helpers::client_admin_url( $f->client_id ) : admin_url( 'admin.php?page=wdmcp' ), __( 'Status updated.', 'wdm-client-portal' ) );
	}

	public static function post_delete_file() {
		$id = isset( $_POST['id'] ) ? absint( $_POST['id'] ) : 0;
		self::check( 'wdmcp_del_' . $id );
		$f = WDMCP_Files::get( $id );
		if ( $f ) {
			WDMCP_Files::delete( $id );
		}
		self::back( $f ? WDMCP_Helpers::client_admin_url( $f->client_id ) : admin_url( 'admin.php?page=wdmcp' ), __( 'File deleted.', 'wdm-client-portal' ) );
	}

	public static function post_share_files() {
		$cid = isset( $_POST['client'] ) ? absint( $_POST['client'] ) : 0;
		self::check( 'wdmcp_share_' . $cid );
		$back = WDMCP_Helpers::client_admin_url( $cid );
		if ( ! WDMCP_Helpers::is_client( $cid ) ) {
			self::back( admin_url( 'admin.php?page=wdmcp' ) );
		}
		$note   = isset( $_POST['note'] ) ? sanitize_textarea_field( wp_unslash( $_POST['note'] ) ) : '';
		$files  = WDMCP_Files::normalize_multi( isset( $_FILES['files'] ) ? $_FILES['files'] : array() ); // phpcs:ignore
		$names  = array();
		$errors = array();
		foreach ( $files as $file ) {
			$id = WDMCP_Files::store( $file, $cid, 'out', array( 'note' => $note ) );
			if ( is_wp_error( $id ) ) {
				$errors[] = $file['name'] . ': ' . $id->get_error_message();
			} else {
				$names[] = WDMCP_Files::get( $id )->original_name;
			}
		}
		if ( $names ) {
			$msg = 1 === count( $names )
				/* translators: %s: file */
				? sprintf( __( 'shared %s', 'wdm-client-portal' ), $names[0] )
				/* translators: %d: count */
				: sprintf( __( 'shared %d files', 'wdm-client-portal' ), count( $names ) );
			WDMCP_Activity::log( $cid, 'shared', $msg );
			if ( ! empty( $_POST['notify'] ) ) {
				WDMCP_Notify::files_shared( $cid, $names, $note );
			}
		}
		if ( $errors ) {
			self::back( $back, implode( ' ', $errors ), 'error' );
		}
		self::back(
			$back,
			$names
				/* translators: %d: count */
				? sprintf( _n( '%d file shared.', '%d files shared.', count( $names ), 'wdm-client-portal' ), count( $names ) )
				: __( 'No files were selected.', 'wdm-client-portal' ),
			$names ? 'success' : 'error'
		);
	}

	public static function post_save_settings() {
		self::check( 'wdmcp_settings' );
		$d   = WDMCP_Helpers::defaults();
		$in  = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$val = function ( $k ) use ( $in ) {
			return isset( $in[ $k ] ) ? $in[ $k ] : '';
		};
		$emails = array_filter( array_map( 'sanitize_email', array_map( 'trim', explode( ',', (string) $val( 'notify_emails' ) ) ) ), 'is_email' );

		$s = array(
			'portal_page_id'      => absint( $val( 'portal_page_id' ) ),
			'company_name'        => sanitize_text_field( $val( 'company_name' ) ) ? sanitize_text_field( $val( 'company_name' ) ) : $d['company_name'],
			'logo_url'            => esc_url_raw( $val( 'logo_url' ) ),
			'brand_color'         => WDMCP_Helpers::sanitize_hex( $val( 'brand_color' ), $d['brand_color'] ),
			'accent_color'        => WDMCP_Helpers::sanitize_hex( $val( 'accent_color' ), $d['accent_color'] ),
			'full_screen'         => $val( 'full_screen' ) ? 1 : 0,
			'announcement'        => wp_kses_post( $val( 'announcement' ) ),
			'notify_emails'       => implode( ', ', $emails ),
			'max_file_mb'         => max( 1, absint( $val( 'max_file_mb' ) ) ),
			'allowed_types'       => sanitize_textarea_field( $val( 'allowed_types' ) ),
			'default_manager'     => absint( $val( 'default_manager' ) ),
			'contact_email'       => sanitize_email( $val( 'contact_email' ) ),
			'contact_phone'       => sanitize_text_field( $val( 'contact_phone' ) ),
			'booking_url'         => esc_url_raw( $val( 'booking_url' ) ),
			'payment_url'         => esc_url_raw( $val( 'payment_url' ) ),
			'delete_on_uninstall' => $val( 'delete_on_uninstall' ) ? 1 : 0,
		);
		update_option( WDMCP_Helpers::OPTION, $s );
		self::back( admin_url( 'admin.php?page=wdmcp-settings' ), __( 'Settings saved.', 'wdm-client-portal' ) );
	}
}
