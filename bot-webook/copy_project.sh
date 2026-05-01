#copy all the files except ./data (don't copy the data folder) folders to the project_copy_for_aouse folders


rsync -av --exclude='data/' --exclude='.gitignore' --exclude='.env' --exclude='copy_project.sh' --exclude='project_copy_abo_said' --exclude='project_copy_for_aouse' --exclude='.git' --exclude='node_modules' ./ project_copy_for_aouse/
rsync -av --exclude='data/' --exclude='.gitignore' --exclude='.env' --exclude='copy_project.sh' --exclude='project_copy_abo_said' --exclude='project_copy_for_aouse' --exclude='.git' --exclude='node_modules' ./ project_copy_abo_said/
rsync -av --exclude='data/' --exclude='.gitignore' --exclude='.env' --exclude='copy_project.sh' --exclude='project_copy_abo_said' --exclude='project_copy_for_aouse' --exclude='.git' --exclude='node_modules' ./ abd-alrahman-bot/

