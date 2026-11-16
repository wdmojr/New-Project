<?php
/**
 * Full-screen portal canvas: the portal without the theme's header, footer or sidebars.
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex, nofollow">
	<?php wp_head(); ?>
</head>
<body <?php body_class( 'wdmcp-canvas' ); ?>>
<?php
wp_body_open();
while ( have_posts() ) {
	the_post();
	echo do_shortcode( '[wdm_client_portal]' ); // phpcs:ignore WordPress.Security.EscapeOutput
}
wp_footer();
?>
</body>
</html>
