import { Controller, Get } from "@nestjs/common";
import { LiveService } from "./live.service";
@Controller('live')
export class LiveController{
    constructor(private LiveService:LiveService){}
    @Get('calls')
    async getCallActive(){
    const calls = await this.LiveService.getAllActiveCalls();
    return { success: true, total: calls.length, data: calls };
    }
}