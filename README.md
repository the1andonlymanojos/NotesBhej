# NotesBhej 📚

A centralized course archive for IIITM students to store and share notes, past papers, and course materials.

**Live Link:** https://notesbhej.manoj-shiv.tech/home

## About

Hey everyone! 👋

As y'all know, our college doesn't really have a proper place to store course stuff like notes, past papers, etc. So I made **NotesBhej** – a centralized IIITM course archive.

Right now it has IMT 5th & 6th sem stuff, but the idea is for everyone to upload slides, notes, major/minor papers—whatever helps. Way better than digging through WhatsApp groups.

If you've got suggestions, feature requests, or run into issues, ping me. Let's make our college a lil better, one step PDF at a time.

(Feel free to share this around — the more people know, the more useful it gets.)

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS
- **Database:** Supabase
- **File Storage:** Cloudflare R2 / Any S3 compatible obj store
- **Deployment:** Vercel <3
## Features

- Upload and organize course materials
- Search through uploaded content
- Responsive design for all devices
- User authentication and authorization
- File management and metadata editing

## Getting Started

### Prerequisites

- Node.js
- npm/yarn/pnpm
- Supabase account
- Cloudflare R2 account

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudflare R2 Configuration
R2_BUCKET_NAME=your_bucket_name
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_KEY=your_secret_key
R2_ENDPOINT=your_endpoint
```

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd authtest
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Contributing

We welcome contributions! The codebase is a mess, I know, but it's just Next.js, shadcn, etc. Feel free to make it better.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Getting Supabase Keys

If you want to contribute and need access to the Supabase configuration, hit me up for the anon keys. Just ping me and I'll share the necessary credentials.

### AI Tools Policy

Using AI tools is completely fine, so long as you understand whatever it is you are adding. Feel free to use AI assistance for coding, but make sure you comprehend the code you're contributing.

## TODO Features

Here are some features we'd love to add:

-  **Edit metadata for user's uploaded content** - Allow users to update file descriptions, tags, and other metadata
-  **Past papers browser** - A dedicated view to browse through past years' papers with filtering options
- **CRAIGSLIST page** - exactly what it sounds like.... i want a page where users can yk make posts about anything they wanna sell. much better than sending out mails with students@iiitm.ac.in
- **RAG chatbot** - Need GPU and figure out the logistics of hosting the pipeline 
- **DB schema** - Its a mess that barely works... need to fix it. 
- **Advanced search** - Search by semester, subject, file type, etc.
- **Analytics dashboard** - Track uploads, downloads, and popular content
- **Tagging system** - Better organization with tags and categories



## Acknowledgments

We ❤️ **Cloudflare** for their very generous policies such as egress, storage, and hosting solutions that make this project possible.

## License

This project is open source and available

## Contact

If you have any questions, suggestions, or want to contribute, feel free to reach out!

---

**Let's make our college a lil better, one step PDF at a time.** 🚀
