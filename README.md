# JoyDesk Workspace Collective

Build a modern, responsive ecommerce website for a company called JoyDesk.

Company

JoyDesk

Tagline: Comfort Meets Productivity.

Tech Stack

Frontend: React + Vite + TypeScript + Tailwind CSS

Backend: Supabase

Database: PostgreSQL (Supabase)

Authentication: Supabase Auth

Storage: Supabase Storage

Hosting: Vercel

Icons: Lucide React

Animations: Framer Motion

Theme

Minimal

Professional

Premium

Fast

Clean white background

Primary Color: #0F4C81

Secondary Color: #FF8C00

Accent: #10B981

The website should look like Apple, IKEA Business, and Herman Miller combined.

Main Navigation

Home

Shop

Categories

Brands

Deals

About

Blog

Contact

Track Order

Login

Register

Admin Dashboard

Homepage

Hero Section

Large hero image with modern office furniture.

Headline:

Transform Your Workspace

Subheading:

Premium office furniture, ergonomic chairs, desktops, business laptops, gaming laptops, and workspace accessories.

Buttons

Shop Now

Request Quotation

Featured Categories

Office Chairs

Executive Chairs

Standing Desks

Office Tables

Desktop Computers

Business Laptops

Gaming Laptops

Monitors

Printers

Networking

Accessories

Why Choose Us

Free Delivery

Warranty

Secure Payments

Quality Products

Bulk Corporate Orders

Nationwide Delivery

Featured Products

Latest Products

Best Sellers

New Arrivals

Flash Deals

Brands

HP

Dell

Lenovo

Apple

Asus

Acer

MSI

Logitech

Canon

Brother

Samsung

Testimonials

Newsletter

Footer

Company

Customer Service

Policies

Social Media

Newsletter

Copyright

Pages

Home

Shop

Category Page

Product Details

Brands

Deals

Wishlist

Compare Products

Shopping Cart

Checkout

Order Success

Track Order

About

Contact

Blog

FAQ

Privacy Policy

Terms

Returns Policy

User Features

Register

Login

Forgot Password

Google Login

Profile

Address Book

Wishlist

Order History

Invoices

Track Orders

Notifications

Admin Dashboard

Dashboard

Products

Categories

Brands

Orders

Customers

Inventory

Coupons

Reviews

Payments

Analytics

Settings

Roles

Permissions

Suppliers

Corporate Quotations

Content Management

Homepage Editor

Product Management

Product fields

Name

SKU

Description

Short Description

Category

Brand

Price

Discount Price

Cost Price

Stock

Weight

Dimensions

Warranty

Images

Video

Specifications

Features

Tags

Rating

Status

Featured

Trending

New Arrival

Best Seller

Flash Deal

Database Schema

profiles

id

full_name

phone

email

role

avatar

created_at

categories

id

name

slug

image

description

status

brands

id

name

logo

website

description

products

id

category_id

brand_id

name

slug

sku

description

short_description

price

discount_price

cost_price

stock

weight

length

width

height

warranty

rating

featured

trending

new_arrival

best_seller

flash_sale

status

created_at

product_images

id

product_id

image_url

sort_order

product_specs

id

product_id

name

value

customers

id

profile_id

company_name

kra_pin

address

addresses

id

customer_id

county

city

street

postal_code

default_address

cart_items

id

customer_id

product_id

quantity

wishlists

id

customer_id

product_id

orders

id

customer_id

order_number

status

subtotal

shipping

tax

discount

total

payment_method

payment_status

delivery_method

tracking_number

created_at

order_items

id

order_id

product_id

quantity

price

subtotal

payments

id

order_id

provider

transaction_reference

amount

status

paid_at

reviews

id

customer_id

product_id

rating

review

coupons

id

code

discount_type

discount_value

start_date

end_date

usage_limit

status

suppliers

id

company_name

contact_person

phone

email

address

inventory_logs

id

product_id

change_type

quantity

reason

created_at

blog_posts

id

title

slug

cover_image

content

author

published_at

contact_messages

id

name

email

phone

subject

message

status

corporate_quotes

id

company_name

contact_person

email

phone

requirements

status

quoted_price

created_at

notifications

id

user_id

title

message

read

created_at

Settings

Enable M-Pesa

Enable Stripe

Enable PayPal

Enable Cash on Delivery

Enable Bank Transfer

Search

Global search with autocomplete.

Filters

Price

Brand

Category

Color

Material

Stock

Rating

SEO

Dynamic meta titles

Meta descriptions

Open Graph

Structured data

XML sitemap

robots.txt

Canonical URLs

Performance

Image optimization

Lazy loading

Pagination

Caching

Responsive images

Security

Row Level Security

JWT Authentication

Admin permissions

Secure checkout

Input validation

Rate limiting

Analytics

Revenue

Orders

Visitors

Conversion Rate

Top Products

Top Categories

Top Customers

Generate the complete production ready application with a beautiful UI, reusable components, responsive layouts, Supabase SQL migrations, Row Level Security policies, authentication, sample seed data, API integrations, and a fully functional admin dashboard. The code should be clean, modular, scalable, and enterprise grade., admin  can dynamically update favicon, icon,  admin has  email configuration for  email smtp, use node mailer , add alll kind of email notification, add  beutiful email teplate , that admin edits content for alll notification, marketing section. be creative. dont ask questions

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://joydesk.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c0ef920f-91ee-4425-baa3-22ef1a559adb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
