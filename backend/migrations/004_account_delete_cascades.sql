ALTER TABLE IF EXISTS folders
    DROP CONSTRAINT IF EXISTS folders_parent_id_fkey,
    ADD CONSTRAINT folders_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS folders
    DROP CONSTRAINT IF EXISTS folders_user_id_fkey,
    ADD CONSTRAINT folders_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS files
    DROP CONSTRAINT IF EXISTS files_user_id_fkey,
    ADD CONSTRAINT files_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS files
    DROP CONSTRAINT IF EXISTS files_folder_id_fkey,
    ADD CONSTRAINT files_folder_id_fkey
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS shared_links
    DROP CONSTRAINT IF EXISTS shared_links_file_id_fkey,
    ADD CONSTRAINT shared_links_file_id_fkey
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS shared_links
    DROP CONSTRAINT IF EXISTS shared_links_user_id_fkey,
    ADD CONSTRAINT shared_links_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS activities
    DROP CONSTRAINT IF EXISTS activities_user_id_fkey,
    ADD CONSTRAINT activities_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS activities
    DROP CONSTRAINT IF EXISTS activities_file_id_fkey,
    ADD CONSTRAINT activities_file_id_fkey
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS activities
    DROP CONSTRAINT IF EXISTS activities_folder_id_fkey,
    ADD CONSTRAINT activities_folder_id_fkey
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL;
