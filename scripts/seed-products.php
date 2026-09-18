<?php

if (! defined('ABSPATH')) {
    exit;
}

if (! class_exists('WC_Product_Simple')) {
    WP_CLI::error('WooCommerce is not active.');
}

$category_name = 'Engineering Demo';
$term = term_exists($category_name, 'product_cat');

if (! $term) {
    $term = wp_insert_term($category_name, 'product_cat');
}

if (is_wp_error($term)) {
    WP_CLI::error($term->get_error_message());
}

$category_id = (int) (is_array($term) ? $term['term_id'] : $term);

$products = [
    [
        'name'        => 'Alpine Headless Tent',
        'sku'         => 'DEMO-TENT-001',
        'price'       => '249.00',
        'description' => 'A sample WooCommerce product used to demonstrate a headless Next.js catalogue.',
    ],
    [
        'name'        => 'Trail API Backpack',
        'sku'         => 'DEMO-PACK-001',
        'price'       => '129.00',
        'description' => 'A seeded product for REST and Store API integration examples.',
    ],
    [
        'name'        => 'Server Components Mug',
        'sku'         => 'DEMO-MUG-001',
        'price'       => '24.00',
        'description' => 'A simple product rendered by a Next.js Server Component.',
    ],
    [
        'name'        => 'CI Pipeline Lantern',
        'sku'         => 'DEMO-LAMP-001',
        'price'       => '59.00',
        'description' => 'A demo product representing the CI/CD layer of the project.',
    ],
];

foreach ($products as $product_data) {
    $existing_id = wc_get_product_id_by_sku($product_data['sku']);
    $product = $existing_id ? wc_get_product($existing_id) : new WC_Product_Simple();

    if (! $product instanceof WC_Product_Simple) {
        WP_CLI::warning(sprintf('Skipping SKU %s because it is not a simple product.', $product_data['sku']));
        continue;
    }

    $product->set_name($product_data['name']);
    $product->set_sku($product_data['sku']);
    $product->set_regular_price($product_data['price']);
    $product->set_description($product_data['description']);
    $product->set_short_description($product_data['description']);
    $product->set_status('publish');
    $product->set_catalog_visibility('visible');
    $product->set_virtual(true);
    $product->set_manage_stock(true);
    $product->set_stock_quantity(20);
    $product->set_stock_status('instock');
    $product->set_category_ids([$category_id]);
    $product->save();

    WP_CLI::log(sprintf('Ready: %s (%s)', $product_data['name'], $product_data['sku']));
}

WP_CLI::success('Demo products are ready.');
